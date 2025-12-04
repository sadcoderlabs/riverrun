/**
 * ArbitrumBridgeAdapter - Implementation of ArbitrumBridgePort
 *
 * Handles Arbitrum L2 interactions for bridging USDC to Hyperliquid.
 *
 * Key implementation note:
 * Arbitrum gas includes L1 data posting costs, so ERC20 transfers require
 * ~250,000+ gas (vs ~65,000 on Ethereum mainnet). We use eth_estimateGas
 * to get accurate gas limits.
 */

import { Contract, formatUnits, parseUnits, JsonRpcProvider, Transaction, Signature } from 'ethers';
import type { ArbitrumBridgePort } from '../application/ports/ArbitrumBridgePort';
import type { TelemetryPort } from '../../telemetry/ports/telemetryPort';
import type { ActiveWallet } from '../../wallet/ports/types';
import { ARBITRUM_CONFIG, ERC20_ABI, GAS_SETTINGS } from '../config';

export class ArbitrumBridgeAdapter implements ArbitrumBridgePort {
  constructor(private readonly telemetryService: TelemetryPort) {}

  async getArbitrumBalance(walletAddress: string): Promise<string | undefined> {
    try {
      const provider = new JsonRpcProvider(ARBITRUM_CONFIG.rpcUrl);
      const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, provider);
      const balanceRaw = await usdcContract.balanceOf(walletAddress);
      const decimals = await usdcContract.decimals();
      return formatUnits(balanceRaw, decimals);
    } catch (err) {
      console.error('[ArbitrumBridgeAdapter] Failed to fetch USDC balance:', err);
      this.telemetryService.captureWarning('Failed to fetch USDC balance on Arbitrum', {
        component: 'ArbitrumBridgeAdapter',
        action: 'getArbitrumBalance',
        extra: { walletAddress },
      });
      return undefined;
    }
  }

  async getArbitrumEthBalance(walletAddress: string): Promise<string | undefined> {
    try {
      const provider = new JsonRpcProvider(ARBITRUM_CONFIG.rpcUrl);
      const balanceRaw = await provider.getBalance(walletAddress);
      return formatUnits(balanceRaw, 18);
    } catch (err) {
      console.error('[ArbitrumBridgeAdapter] Failed to fetch ETH balance:', err);
      this.telemetryService.captureWarning('Failed to fetch ETH balance on Arbitrum', {
        component: 'ArbitrumBridgeAdapter',
        action: 'getArbitrumEthBalance',
        extra: { walletAddress },
      });
      return undefined;
    }
  }

  async depositUsdc(wallet: ActiveWallet, amount: string, bridgeAddress: string): Promise<string> {
    if (wallet.type === 'privy') {
      return this.depositUsdcWithPrivy(wallet, bridgeAddress, amount);
    } else if (wallet.type === 'external') {
      return this.depositUsdcWithExternalWallet(wallet, bridgeAddress, amount);
    } else {
      throw new Error('Unsupported wallet type');
    }
  }

  /**
   * Deposit USDC using Privy embedded wallet
   *
   * Uses eth_sign for transaction signing because Privy's eth_signTransaction
   * may override gas parameters. We build and sign the transaction manually
   * to ensure correct gas settings for Arbitrum.
   */
  private async depositUsdcWithPrivy(
    wallet: ActiveWallet,
    to: string,
    amount: string,
  ): Promise<string> {
    const walletProvider = await wallet.getProvider();
    if (!walletProvider) {
      throw new Error('Provider not available');
    }

    // Use independent provider for RPC calls (more reliable than Privy's provider)
    const provider = new JsonRpcProvider(ARBITRUM_CONFIG.rpcUrl);
    const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, provider);

    // Validate USDC balance
    const decimals = await usdcContract.decimals();
    const amountRaw = parseUnits(amount, decimals);
    const usdcBalance = await usdcContract.balanceOf(wallet.address);
    if (usdcBalance < amountRaw) {
      throw new Error(
        `Insufficient USDC balance. You have ${formatUnits(usdcBalance, decimals)} USDC but need ${amount} USDC`,
      );
    }

    // Prepare transaction data
    const transferData = usdcContract.interface.encodeFunctionData('transfer', [to, amountRaw]);
    const [feeData, nonce, gasLimit] = await Promise.all([
      provider.getFeeData(),
      provider.getTransactionCount(wallet.address, 'pending'),
      this.estimateGas(provider, wallet.address, transferData),
    ]);

    // Calculate gas price with safety margin
    const maxFeePerGas = this.getMaxFeePerGas(feeData);
    const maxPriorityFeePerGas = GAS_SETTINGS.minMaxPriorityFeePerGas;

    // Validate ETH balance for gas
    const ethBalance = await provider.getBalance(wallet.address);
    const maxGasCost = gasLimit * maxFeePerGas;
    if (ethBalance < maxGasCost) {
      throw new Error(
        `Insufficient ETH for gas. You need approximately ${parseFloat(formatUnits(maxGasCost, 18)).toFixed(6)} ETH but only have ${parseFloat(formatUnits(ethBalance, 18)).toFixed(6)} ETH`,
      );
    }

    // Build and sign transaction manually
    const tx = Transaction.from({
      to: ARBITRUM_CONFIG.usdcAddress,
      data: transferData,
      value: 0n,
      gasLimit,
      maxFeePerGas,
      maxPriorityFeePerGas,
      nonce,
      chainId: BigInt(ARBITRUM_CONFIG.chainId),
      type: 2,
    });

    const signature = (await walletProvider.send('eth_sign', [
      wallet.address,
      tx.unsignedHash,
    ])) as string;
    tx.signature = Signature.from(signature);

    // Broadcast and wait
    const txHash = await provider.send('eth_sendRawTransaction', [tx.serialized]);
    await provider.waitForTransaction(txHash);

    return txHash;
  }

  /**
   * Deposit USDC using external wallet (Reown/WalletConnect)
   *
   * Uses standard ethers.js contract interaction - external wallets
   * handle gas estimation correctly.
   */
  private async depositUsdcWithExternalWallet(
    wallet: ActiveWallet,
    to: string,
    amount: string,
  ): Promise<string> {
    const provider = await wallet.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(ARBITRUM_CONFIG.chainId)) {
      throw new Error(
        `Wrong network. Please switch to Arbitrum (chainId: ${ARBITRUM_CONFIG.chainId})`,
      );
    }

    const signer = await provider.getSigner();
    const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, signer);

    const decimals = await usdcContract.decimals();
    const amountRaw = parseUnits(amount, decimals);

    const balanceRaw = await usdcContract.balanceOf(wallet.address);
    if (balanceRaw < amountRaw) {
      throw new Error(
        `Insufficient USDC balance. You have ${formatUnits(balanceRaw, decimals)} USDC but need ${amount} USDC`,
      );
    }

    const tx = await usdcContract.transfer(to, amountRaw);
    await tx.wait();

    return tx.hash;
  }

  /**
   * Estimate gas for Arbitrum transaction.
   * Arbitrum gas includes L1 data posting costs (~250k+ for ERC20 transfer).
   */
  private async estimateGas(
    provider: JsonRpcProvider,
    from: string,
    data: string,
  ): Promise<bigint> {
    try {
      const estimated = await provider.send('eth_estimateGas', [
        { from, to: ARBITRUM_CONFIG.usdcAddress, data },
      ]);
      // Add 20% buffer
      return (BigInt(estimated) * 120n) / 100n;
    } catch {
      return GAS_SETTINGS.erc20TransferGasLimit;
    }
  }

  private getMaxFeePerGas(feeData: {
    maxFeePerGas: bigint | null;
    gasPrice: bigint | null;
  }): bigint {
    const baseFee = feeData.maxFeePerGas ?? feeData.gasPrice ?? 0n;
    const withMultiplier = BigInt(Math.ceil(Number(baseFee) * GAS_SETTINGS.gasPriceMultiplier));
    return withMultiplier > GAS_SETTINGS.minMaxFeePerGas
      ? withMultiplier
      : GAS_SETTINGS.minMaxFeePerGas;
  }
}
