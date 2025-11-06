import { Contract, formatUnits } from 'ethers';
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
  switchToArbitrum: () => Promise<void>;
}

/**
 * Hook for monitoring Arbitrum USDC balance
 *
 * Automatically fetches and monitors the user's USDC balance on Arbitrum
 * Updates every 10 seconds while the component is mounted
 *
 * @returns Balance information and network switching utilities
 */
export function useArbitrumUSDCBalance(): UseArbitrumUSDCBalanceResult {
  const { address, getProvider, switchChain } = useActiveWallet();
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
    switchToArbitrum,
  };
}
