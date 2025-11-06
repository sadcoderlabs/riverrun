import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { Contract, parseUnits, JsonRpcProvider } from 'ethers';
import { useCallback, useState } from 'react';
import { useActiveWallet } from './useActiveWallet';

// Arbitrum USDC contract address
const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// Arbitrum chain ID
const ARBITRUM_CHAIN_ID = 42161;

// Independent RPC provider URL
const ARBITRUM_RPC_URL = 'https://arb1.arbitrum.io/rpc';

// Fixed gas limit for ERC20 transfers
const ERC20_TRANSFER_GAS_LIMIT = 100000n;

// Minimal ERC20 ABI for balance and transfer
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export interface UseSendTransactionResult {
  /**
   * Deposit USDC to a recipient address on Arbitrum
   *
   * @param to Recipient address
   * @param amount Amount in USDC (human-readable, e.g., "10.5")
   * @returns Transaction hash
   */
  depositUsdc: (to: string, amount: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for sending transactions
 *
 * Handles different wallet providers (Privy embedded wallet vs external wallets)
 * and abstracts away the complexity of transaction signing and broadcasting.
 *
 * Currently supports:
 * - USDC deposits on Arbitrum
 *
 * @example
 * ```tsx
 * const { depositUsdc, isLoading, error } = useSendTransaction();
 *
 * const handleDeposit = async () => {
 *   try {
 *     const txHash = await depositUsdc(recipientAddress, "10.5");
 *     console.log('Transaction sent:', txHash);
 *   } catch (err) {
 *     console.error('Transaction failed:', err);
 *   }
 * };
 * ```
 */
export function useSendTransaction(): UseSendTransactionResult {
  const { address, walletType, getProvider } = useActiveWallet();
  const { wallets: embeddedWallets } = useEmbeddedEthereumWallet();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Deposit USDC using Privy embedded wallet
   * Uses eth_signTransaction + independent RPC broadcast to work around Privy's gas estimation bug
   */
  const depositUsdcWithPrivy = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!embeddedWallets || embeddedWallets.length === 0) {
        throw new Error('Privy wallet not available');
      }

      const wallet = embeddedWallets[0];
      const privyProvider = await wallet.getProvider();

      // Request accounts from Privy
      const accounts = (await privyProvider.request({
        method: 'eth_requestAccounts',
      })) as string[];

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available');
      }

      // Create independent RPC provider for reading blockchain state and broadcasting
      const independentProvider = new JsonRpcProvider(ARBITRUM_RPC_URL);

      // Get token info
      const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, independentProvider);
      const decimals = await usdcContract.decimals();
      const amountRaw = parseUnits(amount, decimals);

      // Check balance
      const balance = await usdcContract.balanceOf(accounts[0]);
      if (balance < amountRaw) {
        throw new Error(
          `Insufficient balance. You have ${balance.toString()} but need ${amountRaw.toString()}`,
        );
      }

      // Encode transfer function
      const transferData = usdcContract.interface.encodeFunctionData('transfer', [to, amountRaw]);

      // Get fee data and nonce
      const feeData = await independentProvider.getFeeData();
      const nonce = await independentProvider.getTransactionCount(accounts[0], 'pending');

      // Build transaction for signing
      const txToSign = {
        from: accounts[0],
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

      // Sign with Privy provider
      const signedTx = await privyProvider.request({
        method: 'eth_signTransaction',
        params: [txToSign],
      });

      // Broadcast with independent provider
      const txHash = await independentProvider.send('eth_sendRawTransaction', [signedTx as string]);

      // Wait for confirmation
      await independentProvider.waitForTransaction(txHash);

      return txHash;
    },
    [embeddedWallets],
  );

  /**
   * Deposit USDC using external wallet (Reown)
   * Uses standard ethers.js contract interaction
   */
  const depositUsdcWithExternalWallet = useCallback(
    async (to: string, amount: string): Promise<string> => {
      const provider = await getProvider();
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
      const balance = await usdcContract.balanceOf(address);
      if (balance < amountRaw) {
        throw new Error(
          `Insufficient balance. You have ${balance.toString()} but need ${amountRaw.toString()}`,
        );
      }

      // Send transaction
      const tx = await usdcContract.transfer(to, amountRaw);

      // Wait for confirmation
      await tx.wait();

      return tx.hash;
    },
    [address, getProvider],
  );

  /**
   * Deposit USDC to a recipient address
   * Automatically handles different wallet types
   */
  const depositUsdc = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      setIsLoading(true);
      setError(null);

      try {
        let txHash: string;

        if (walletType === 'privy') {
          txHash = await depositUsdcWithPrivy(to, amount);
        } else if (walletType === 'external') {
          txHash = await depositUsdcWithExternalWallet(to, amount);
        } else {
          throw new Error('Unknown wallet type');
        }

        return txHash;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Transaction failed';
        setError(errorMessage);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [address, walletType, depositUsdcWithPrivy, depositUsdcWithExternalWallet],
  );

  return {
    depositUsdc,
    isLoading,
    error,
  };
}
