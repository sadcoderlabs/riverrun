import { Contract, formatUnits, parseUnits, JsonRpcProvider } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { useWalletContext } from '@/core/composition';

// Arbitrum USDC contract address
export const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// Arbitrum chain ID
const ARBITRUM_CHAIN_ID = 42161;

// Independent RPC provider URL for Privy workaround
const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';

// Fixed gas limit for ERC20 transfers
const ERC20_TRANSFER_GAS_LIMIT = 100000n;

// Minimal ERC20 ABI for balance and transfer
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export interface UseArbitrumUsdcResult {
  /**
   * Current USDC balance as a formatted string (e.g., "10.5"), or null if not available
   */
  balance: string | null;

  /**
   * Deposit USDC to a recipient address on Arbitrum
   *
   * @param to Recipient address
   * @param amount Amount in USDC (human-readable, e.g., "10.5")
   * @returns Transaction hash
   */
  depositUsdc: (to: string, amount: string) => Promise<string>;
}

/**
 * Hook for Arbitrum USDC operations
 *
 * Provides:
 * - Automatic balance monitoring (updates every 10 seconds)
 * - USDC transfer functionality with proper wallet handling
 * - Automatic network switching to Arbitrum if needed
 *
 * Handles different wallet providers (Privy embedded wallet vs external wallets)
 * and abstracts away the complexity of transaction signing and broadcasting.
 *
 * @example
 * ```tsx
 * const { balance, depositUsdc } = useArbitrumUsdc();
 *
 * const handleDeposit = async () => {
 *   try {
 *     const txHash = await depositUsdc(recipientAddress, "10.5");
 *     console.log('Transaction sent:', txHash);
 *   } catch (err) {
 *     console.error('Transaction failed:', err);
 *   }
 * };
 *
 * return <Text>{balance || '0.0'} USDC</Text>;
 * ```
 */
export function useArbitrumUsdc(): UseArbitrumUsdcResult {
  const { wallet } = useWalletContext();
  const [balance, setBalance] = useState<string | null>(null);

  const fetchBalance = useCallback(async () => {
    if (!wallet) {
      setBalance(null);
      return;
    }

    try {
      const provider = await wallet.getProvider();
      if (!provider) {
        return;
      }

      // Check if we're on Arbitrum (chainId 42161)
      const network = await provider.getNetwork();

      if (network.chainId !== 42161n) {
        // Automatically attempt to switch to Arbitrum
        try {
          await wallet.switchChain(42161);
          // Wait for the switch to complete and retry on next poll
          return;
        } catch (switchError) {
          console.error('Failed to switch to Arbitrum network:', switchError);
          return;
        }
      }

      const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, provider);
      const balanceRaw = await usdcContract.balanceOf(wallet.address);
      const decimals = await usdcContract.decimals();

      // Format balance to human-readable string
      const formattedBalance = formatUnits(balanceRaw, decimals);
      setBalance(formattedBalance);
    } catch (err) {
      console.error('Failed to fetch USDC balance:', err);
      setBalance(null);
    }
  }, [wallet]);

  // Fetch balance on mount and when address changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Poll balance every 10 seconds
  useEffect(() => {
    if (!wallet) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [wallet, fetchBalance]);

  /**
   * Deposit USDC using Privy embedded wallet
   * Uses eth_signTransaction + independent RPC broadcast to work around Privy's gas estimation bug
   */
  const depositUsdcWithPrivy = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet address not available');
      }

      // Get Privy provider through useWalletContext
      const provider = await wallet.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Create independent RPC provider for reading blockchain state and broadcasting
      const independentProvider = new JsonRpcProvider(ARBITRUM_RPC_URL);

      // Get token info
      const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, independentProvider);
      const decimals = await usdcContract.decimals();
      const amountRaw = parseUnits(amount, decimals);

      // Check balance
      const balanceRaw = await usdcContract.balanceOf(wallet.address);
      if (balanceRaw < amountRaw) {
        throw new Error(
          `Insufficient balance. You have ${balanceRaw.toString()} but need ${amountRaw.toString()}`,
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
        to: ARBITRUM_USDC_ADDRESS,
        value: '0x0',
        data: transferData,
        gasLimit: '0x' + ERC20_TRANSFER_GAS_LIMIT.toString(16),
        maxFeePerGas: feeData.maxFeePerGas ? '0x' + feeData.maxFeePerGas.toString(16) : undefined,
        maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
          ? '0x' + feeData.maxPriorityFeePerGas.toString(16)
          : undefined,
        nonce: '0x' + nonce.toString(16),
        chainId: '0x' + ARBITRUM_CHAIN_ID.toString(16),
      };

      // Sign with Privy provider using BrowserProvider.send()
      const signedTx = (await provider.send('eth_signTransaction', [txToSign])) as string;

      // Broadcast with independent provider
      const txHash = await independentProvider.send('eth_sendRawTransaction', [signedTx]);

      // Wait for confirmation
      await independentProvider.waitForTransaction(txHash);

      // Refresh balance after successful transfer
      await fetchBalance();

      return txHash;
    },
    [wallet, fetchBalance],
  );

  /**
   * Deposit USDC using external wallet (Reown)
   * Uses standard ethers.js contract interaction
   */
  const depositUsdcWithExternalWallet = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not available');
      }

      const provider = await wallet.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Check network
      const network = await provider.getNetwork();
      if (network.chainId !== BigInt(ARBITRUM_CHAIN_ID)) {
        throw new Error(
          `Wrong network. Please switch to Arbitrum (chainId: ${ARBITRUM_CHAIN_ID}, current: ${network.chainId})`,
        );
      }

      const signer = await provider.getSigner();
      const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, signer);

      const decimals = await usdcContract.decimals();
      const amountRaw = parseUnits(amount, decimals);

      // Check balance
      const balanceRaw = await usdcContract.balanceOf(wallet.address);
      if (balanceRaw < amountRaw) {
        throw new Error(
          `Insufficient balance. You have ${balanceRaw.toString()} but need ${amountRaw.toString()}`,
        );
      }

      // Send transaction
      const tx = await usdcContract.transfer(to, amountRaw);

      // Wait for confirmation
      await tx.wait();

      // Refresh balance after successful transfer
      await fetchBalance();

      return tx.hash;
    },
    [wallet, fetchBalance],
  );

  /**
   * Deposit USDC to a recipient address
   * Automatically handles different wallet types
   */
  const depositUsdc = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!wallet) {
        throw new Error('Wallet not connected');
      }

      if (wallet.type === 'privy') {
        return await depositUsdcWithPrivy(to, amount);
      } else if (wallet.type === 'external') {
        return await depositUsdcWithExternalWallet(to, amount);
      } else {
        throw new Error('Unknown wallet type');
      }
    },
    [wallet, depositUsdcWithPrivy, depositUsdcWithExternalWallet],
  );

  return {
    balance,
    depositUsdc,
  };
}
