import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { useSubscription, type WebData3Data } from '../subscription';
import { useMemo } from 'react';

export interface UseWebData3Result {
  data: WebData3Data | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's webData3 for positions across ALL DEXs
 *
 * webData3 contains perpDexStates array with positions from:
 * - Validator perps (index 0): BTC, ETH, etc.
 * - HIP-3 DEXs (index 1+): xyz:GOOGL, xyz:TSLA, etc.
 *
 * Use this hook to get account metrics that include HIP-3 positions.
 *
 * Note: webData3 is WebSocket-only (no HTTP endpoint), so initial data
 * may take slightly longer (~1s) compared to webData2's HTTP+WS hybrid approach.
 *
 * @returns webData3 with loading and error states
 */
export function useWebData3(): UseWebData3Result {
  const { wallet } = useWallet();

  // WebSocket subscription for real-time updates
  // webData3 is WebSocket-only - no HTTP endpoint available
  const { data, isLoading, error } = useSubscription<WebData3Data>(
    'webData3',
    wallet ? { user: wallet.address } : undefined,
  );

  return useMemo(
    () => ({
      data,
      isLoading,
      error: error || undefined,
    }),
    [data, isLoading, error],
  );
}
