import { useEffect, useState, useCallback } from 'react';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import {
  generateDepositAddress,
  type SourceChain,
  type Asset,
  type GenerateAddressResponse,
} from '../api';

export interface UseUnitDepositAddressResult {
  address: string | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook for generating and managing Unit Protocol deposit address
 *
 * Automatically generates a deposit address for the user's Hyperliquid wallet
 * The address is permanent and tied to the user's Hyperliquid address
 *
 * @param srcChain - Source chain (bitcoin, ethereum, solana)
 * @param asset - Asset symbol (btc, eth, sol)
 * @returns Deposit address information
 */
export function useUnitDepositAddress(
  srcChain: SourceChain,
  asset: Asset,
): UseUnitDepositAddressResult {
  const { address: hyperliquidAddress, isAuthenticated } = useActiveWallet();
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async () => {
    if (!hyperliquidAddress || !isAuthenticated) {
      setAddress(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const response = await generateDepositAddress(srcChain, asset, hyperliquidAddress);

      if (response.status === 'OK' && response.address) {
        setAddress(response.address);
      } else {
        throw new Error('Failed to generate deposit address');
      }
    } catch (err) {
      console.error('Failed to fetch deposit address:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate address');
      setAddress(null);
    } finally {
      setIsLoading(false);
    }
  }, [srcChain, asset, hyperliquidAddress, isAuthenticated]);

  // Fetch address on mount and when dependencies change
  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  return {
    address,
    isLoading,
    error,
    refetch: fetchAddress,
  };
}
