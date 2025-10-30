import { useEffect, useState } from 'react';
import {
  generateWithdrawalAddress,
  type DestinationChain,
  type Asset,
} from '../api';

interface UseUnitWithdrawalAddressResult {
  address: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook to generate and manage Unit Protocol withdrawal address
 *
 * This generates a Hyperliquid address that, when sent tokens via spotSend,
 * will forward those tokens to the destination chain address.
 *
 * @param dstChain - Destination chain (ethereum, bitcoin, solana)
 * @param asset - Asset symbol (eth, btc, sol)
 * @param dstAddr - Destination address on target chain (e.g., user's Ethereum address)
 * @returns Hyperliquid withdrawal address, loading state, and error
 */
export function useUnitWithdrawalAddress(
  dstChain: DestinationChain | null,
  asset: Asset | null,
  dstAddr: string | null,
): UseUnitWithdrawalAddressResult {
  const [address, setAddress] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Only proceed if all parameters are provided
    if (!dstChain || !asset || !dstAddr) {
      setAddress(null);
      setError(null);
      return;
    }

    const fetchWithdrawalAddress = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await generateWithdrawalAddress(dstChain, asset, dstAddr);

        if (response.status === 'OK' && response.address) {
          setAddress(response.address);
        } else {
          setError('Failed to generate withdrawal address');
          setAddress(null);
        }
      } catch (err) {
        console.error('Error generating withdrawal address:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        setAddress(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWithdrawalAddress();
  }, [dstChain, asset, dstAddr]);

  return {
    address,
    isLoading,
    error,
  };
}
