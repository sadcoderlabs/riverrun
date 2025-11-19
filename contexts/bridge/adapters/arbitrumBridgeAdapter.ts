/**
 * ArbitrumBridgeAdapter - Implementation of ArbitrumBridgePort
 *
 * This adapter implements the ArbitrumBridgePort interface and handles
 * all Arbitrum L2 interactions:
 * - Query USDC balance from ERC20 contract
 * - Query ETH balance from Arbitrum L2
 * - Transfer USDC to Hyperliquid bridge contract
 * - Handle different wallet types (Privy embedded vs external wallets)
 * - Network switching to Arbitrum if needed
 *
 * Design principles:
 * - Pure infrastructure logic (no business rules)
 * - Handles wallet provider differences
 * - Throws errors for upper layers to handle
 */

import { Contract, formatUnits, parseUnits, JsonRpcProvider } from 'ethers';
import type { ArbitrumBridgePort } from '../application/ports/ArbitrumBridgePort';
import type { ActiveWallet } from '../../wallet/ports/types';
import { ARBITRUM_CONFIG, ERC20_ABI, GAS_SETTINGS } from '../config';

/**
 * ArbitrumBridgeAdapter
 *
 * Implements ArbitrumBridgePort for Arbitrum L2 operations.
 */
export class ArbitrumBridgeAdapter implements ArbitrumBridgePort {
  /**
   * Get USDC balance on Arbitrum
   *
   * @param walletAddress - User's wallet address
   * @returns Formatted USDC balance (e.g., "10.5") or undefined if unavailable
   */
  async getArbitrumBalance(walletAddress: string): Promise<string | undefined> {
    try {
      // Use public RPC provider for read-only operation
      const provider = new JsonRpcProvider(ARBITRUM_CONFIG.rpcUrl);

      const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, provider);
      const balanceRaw = await usdcContract.balanceOf(walletAddress);
      const decimals = await usdcContract.decimals();

      // Format balance to human-readable string
      const formattedBalance = formatUnits(balanceRaw, decimals);
      return formattedBalance;
    } catch (err) {
      console.error('[ArbitrumBridgeAdapter] Failed to fetch USDC balance:', err);
      return undefined;
    }
  }

  /**
   * Get ETH balance on Arbitrum
   *
   * @param walletAddress - User's wallet address
   * @returns Formatted ETH balance (e.g., "0.5") or undefined if unavailable
   */
  async getArbitrumEthBalance(walletAddress: string): Promise<string | undefined> {
    try {
      // Use public RPC provider for read-only operation
      const provider = new JsonRpcProvider(ARBITRUM_CONFIG.rpcUrl);

      // Get native ETH balance (no contract needed)
      const balanceRaw = await provider.getBalance(walletAddress);

      // Format balance to human-readable string (ETH has 18 decimals)
      const formattedBalance = formatUnits(balanceRaw, 18);
      return formattedBalance;
    } catch (err) {
      console.error('[ArbitrumBridgeAdapter] Failed to fetch ETH balance:', err);
      return undefined;
    }
  }

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   *
   * Handles wallet type differences internally:
   * - Privy: Uses eth_signTransaction + independent RPC broadcast
   * - External: Uses standard ethers.js contract interaction
   *
   * @param wallet - User's active wallet (contains type, provider, address)
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @param bridgeAddress - Destination bridge contract address
   * @returns Transaction hash
   * @throws Error if transaction fails or validation fails
   */
  async depositUsdc(wallet: ActiveWallet, amount: string, bridgeAddress: string): Promise<string> {
    // Dispatch based on wallet type
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
   * Uses eth_signTransaction + independent RPC broadcast to work around
   * Privy's gas estimation bug.
   *
   * @param wallet - Privy embedded wallet
   * @param to - Recipient address (bridge contract)
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Transaction hash
   * @throws Error if transaction fails
   */
  private async depositUsdcWithPrivy(
    wallet: ActiveWallet,
    to: string,
    amount: string,
  ): Promise<string> {
    const provider = await wallet.getProvider();
    if (!provider) {
      throw new Error('Provider not available');
    }

    // Create independent RPC provider for reading blockchain state and broadcasting
    const independentProvider = new JsonRpcProvider(ARBITRUM_CONFIG.rpcUrl);

    // Get token info
    const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, independentProvider);
    const decimals = await usdcContract.decimals();
    const amountRaw = parseUnits(amount, decimals);

    // Check balance
    const balanceRaw = await usdcContract.balanceOf(wallet.address);
    if (balanceRaw < amountRaw) {
      throw new Error(
        `Insufficient balance. You have ${formatUnits(balanceRaw, decimals)} but need ${amount}`,
      );
    }

    // Encode transfer function
    const transferData = usdcContract.interface.encodeFunctionData('transfer', [to, amountRaw]);

    // Get fee data and nonce
    const feeData = await independentProvider.getFeeData();
    const nonce = await independentProvider.getTransactionCount(wallet.address, 'pending');

    // Build transaction for signing
    const txToSign = {
      from: wallet.address,
      to: ARBITRUM_CONFIG.usdcAddress,
      value: '0x0',
      data: transferData,
      gasLimit: '0x' + GAS_SETTINGS.erc20TransferGasLimit.toString(16),
      maxFeePerGas: feeData.maxFeePerGas ? '0x' + feeData.maxFeePerGas.toString(16) : undefined,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
        ? '0x' + feeData.maxPriorityFeePerGas.toString(16)
        : undefined,
      nonce: '0x' + nonce.toString(16),
      chainId: '0x' + ARBITRUM_CONFIG.chainId.toString(16),
    };

    // Sign with Privy provider using BrowserProvider.send()
    const signedTx = (await provider.send('eth_signTransaction', [txToSign])) as string;

    // Broadcast with independent provider
    const txHash = await independentProvider.send('eth_sendRawTransaction', [signedTx]);

    // Wait for confirmation
    await independentProvider.waitForTransaction(txHash);

    return txHash;
  }

  /**
   * Deposit USDC using external wallet (Reown)
   *
   * Uses standard ethers.js contract interaction.
   *
   * @param wallet - External wallet (e.g., Reown)
   * @param to - Recipient address (bridge contract)
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Transaction hash
   * @throws Error if transaction fails
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

    // Check network
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(ARBITRUM_CONFIG.chainId)) {
      throw new Error(
        `Wrong network. Please switch to Arbitrum (chainId: ${ARBITRUM_CONFIG.chainId}, current: ${network.chainId})`,
      );
    }

    const signer = await provider.getSigner();
    const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, signer);

    const decimals = await usdcContract.decimals();
    const amountRaw = parseUnits(amount, decimals);

    // Check balance
    const balanceRaw = await usdcContract.balanceOf(wallet.address);
    if (balanceRaw < amountRaw) {
      throw new Error(
        `Insufficient balance. You have ${formatUnits(balanceRaw, decimals)} but need ${amount}`,
      );
    }

    // Send transaction
    const tx = await usdcContract.transfer(to, amountRaw);

    // Wait for confirmation
    await tx.wait();

    return tx.hash;
  }
}
