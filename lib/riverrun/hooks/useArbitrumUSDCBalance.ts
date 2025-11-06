import { useEmbeddedEthereumWallet } from '@privy-io/expo';
import { Contract, formatUnits, parseUnits, JsonRpcProvider } from 'ethers';
import { useCallback, useEffect, useState } from 'react';
import { useActiveWallet } from './useActiveWallet';

// Arbitrum USDC contract address
export const ARBITRUM_USDC_ADDRESS = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831';

// Minimal ERC20 ABI for balance and transfer
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
];

export interface UseArbitrumUSDCBalanceResult {
  balance: string | null;
  isLoading: boolean;
  error: string | null;
  isWrongNetwork: boolean;
  refetch: () => Promise<void>;
  transfer: (to: string, amount: string) => Promise<string>;
  switchToArbitrum: () => Promise<void>;
}

/**
 * Hook for monitoring Arbitrum USDC balance
 *
 * Automatically fetches and monitors the user's USDC balance on Arbitrum
 * Updates every 10 seconds while the component is mounted
 *
 * @returns Balance information and transfer function
 */
export function useArbitrumUSDCBalance(): UseArbitrumUSDCBalanceResult {
  const { address, getProvider, switchChain, walletType } = useActiveWallet();
  const { wallets: embeddedWallets } = useEmbeddedEthereumWallet();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Check if we're on Arbitrum (chainId 42161)
      const network = await provider.getNetwork();

      if (network.chainId !== 42161n) {
        setIsWrongNetwork(true);
        setError(`Please switch to Arbitrum network. Current network: ${network.chainId}`);

        // Since Privy is now configured with Arbitrum as default, this shouldn't happen
        // But if it does, we'll attempt to switch
        try {
          await switchChain(42161);
          // Wait for the switch to complete and retry on next poll
          return;
        } catch (switchError) {
          console.error('Failed to switch network:', switchError);
          setError('Please manually switch to Arbitrum network in your wallet');
          return;
        }
      }

      setIsWrongNetwork(false);

      const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, provider);
      const balanceRaw = await usdcContract.balanceOf(address);
      const decimals = await usdcContract.decimals();

      // Format balance to human-readable string
      const formattedBalance = formatUnits(balanceRaw, decimals);
      setBalance(formattedBalance);
    } catch (err) {
      console.error('Failed to fetch USDC balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, getProvider, switchChain]);

  /**
   * Switch wallet to Arbitrum network manually
   * Uses the unified switchChain API from useActiveWallet
   */
  const switchToArbitrum = useCallback(async () => {
    try {
      await switchChain(42161); // Arbitrum chainId
      console.log('Successfully switched to Arbitrum');

      // Trigger refetch after a short delay to allow network switch to complete
      setTimeout(() => {
        fetchBalance();
      }, 1000);
    } catch (err) {
      console.error('Failed to switch to Arbitrum:', err);
      throw err;
    }
  }, [switchChain, fetchBalance]);

  /**
   * Transfer USDC to a recipient address
   *
   * @param to Recipient address
   * @param amount Amount in USDC (human-readable, e.g., "10.5")
   * @returns Transaction hash
   */
  const transfer = useCallback(
    async (to: string, amount: string): Promise<string> => {
      if (!address) {
        throw new Error('Wallet not connected');
      }

      // Use Privy's official approach for embedded wallets
      if (walletType === 'privy' && embeddedWallets && embeddedWallets.length > 0) {
        const wallet = embeddedWallets[0];
        const privyProvider = await wallet.getProvider();

        // Request accounts from Privy
        const accounts = (await privyProvider.request({
          method: 'eth_requestAccounts',
        })) as string[];

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts available');
        }

        // Create independent RPC provider for gas estimation and broadcasting
        const independentProvider = new JsonRpcProvider('https://arb1.arbitrum.io/rpc');

        // Get token info
        const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, independentProvider);
        const decimals = await usdcContract.decimals();
        const amountRaw = parseUnits(amount, decimals);

        // Encode transfer function
        const transferData = usdcContract.interface.encodeFunctionData('transfer', [to, amountRaw]);

        // Use fixed gas limit for ERC20 transfer (standard is ~65000)
        const gasLimit = 100000n;

        const feeData = await independentProvider.getFeeData();
        const nonce = await independentProvider.getTransactionCount(accounts[0], 'pending');

        // Build transaction for signing
        const txToSign = {
          from: accounts[0],
          to: ARBITRUM_USDC_ADDRESS,
          value: '0x0',
          data: transferData,
          gasLimit: '0x' + gasLimit.toString(16),
          maxFeePerGas: feeData.maxFeePerGas ? '0x' + feeData.maxFeePerGas.toString(16) : undefined,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas
            ? '0x' + feeData.maxPriorityFeePerGas.toString(16)
            : undefined,
          nonce: '0x' + nonce.toString(16),
          chainId: '0xa4b1', // Arbitrum
        };

        // Sign with Privy provider
        const signedTx = await privyProvider.request({
          method: 'eth_signTransaction',
          params: [txToSign],
        });

        // Broadcast with independent provider
        const txHash = await independentProvider.send('eth_sendRawTransaction', [
          signedTx as string,
        ]);

        // Wait for confirmation
        await independentProvider.waitForTransaction(txHash);

        await fetchBalance();
        return txHash;
      }

      // Fallback for external wallets
      const provider = await getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }

      const network = await provider.getNetwork();
      if (network.chainId !== 42161n) {
        throw new Error('Please switch to Arbitrum network');
      }

      const signer = await provider.getSigner();
      const usdcContract = new Contract(ARBITRUM_USDC_ADDRESS, ERC20_ABI, signer);

      const decimals = await usdcContract.decimals();
      const amountRaw = parseUnits(amount, decimals);

      console.log('External wallet transfer:', {
        from: address,
        to,
        amount,
        amountRaw: amountRaw.toString(),
      });

      const tx = await usdcContract.transfer(to, amountRaw);
      console.log('Transaction sent:', tx.hash);

      await tx.wait();
      console.log('Transaction confirmed:', tx.hash);

      await fetchBalance();
      return tx.hash;
    },
    [address, walletType, embeddedWallets, getProvider, fetchBalance],
  );

  // Fetch balance on mount and when address changes
  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  // Poll balance every 10 seconds
  useEffect(() => {
    if (!address) return;

    const interval = setInterval(() => {
      fetchBalance();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [address, fetchBalance]);

  return {
    balance,
    isLoading,
    error,
    isWrongNetwork,
    refetch: fetchBalance,
    transfer,
    switchToArbitrum,
  };
}
