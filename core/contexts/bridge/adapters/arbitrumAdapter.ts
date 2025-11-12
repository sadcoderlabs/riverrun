/**
 * Arbitrum Adapter - Infrastructure adapter for Arbitrum operations
 *
 * This adapter handles all Arbitrum L2 interactions:
 * - Query USDC balance from ERC20 contract
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
import type { Wallet } from '../../wallet/ports/types';
import { ARBITRUM_CONFIG, ERC20_ABI, GAS_SETTINGS } from '../config';

/**
 * Get USDC balance on Arbitrum
 *
 * @param wallet - User's wallet
 * @returns Formatted USDC balance (e.g., "10.5") or undefined if unavailable
 */
export async function getArbitrumUsdcBalance(wallet: Wallet): Promise<string | undefined> {
  try {
    const provider = await wallet.getProvider();
    if (!provider) {
      return undefined;
    }

    // Check if we're on Arbitrum
    const network = await provider.getNetwork();
    if (network.chainId !== BigInt(ARBITRUM_CONFIG.chainId)) {
      // Automatically attempt to switch to Arbitrum
      try {
        await wallet.switchChain(ARBITRUM_CONFIG.chainId);
        // Wait for the switch to complete, caller should retry
        return undefined;
      } catch (switchError) {
        console.error('[ArbitrumAdapter] Failed to switch to Arbitrum:', switchError);
        return undefined;
      }
    }

    const usdcContract = new Contract(ARBITRUM_CONFIG.usdcAddress, ERC20_ABI, provider);
    const balanceRaw = await usdcContract.balanceOf(wallet.address);
    const decimals = await usdcContract.decimals();

    // Format balance to human-readable string
    const formattedBalance = formatUnits(balanceRaw, decimals);
    return formattedBalance;
  } catch (err) {
    console.error('[ArbitrumAdapter] Failed to fetch USDC balance:', err);
    return undefined;
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
export async function depositUsdcWithPrivy(
  wallet: Wallet,
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
export async function depositUsdcWithExternalWallet(
  wallet: Wallet,
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
