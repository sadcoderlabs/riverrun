import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { useSubscription, type WebData2Data } from '../subscription';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as infoClient from '../client/infoClient';

export interface UseWebData2Result {
  data: WebData2Data | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to fetch and subscribe to Hyperliquid's webData2 for comprehensive account data
 *
 * This is a low-level data access hook that provides raw webData2 from Hyperliquid.
 * For calculated metrics (account value, PnL, margin ratio, etc.), use @lib/riverrun/account/useAccountMetrics
 *
 * Architecture:
 * - TanStack Query: Handles HTTP fetch with automatic deduplication and caching
 * - WebSocket Subscription: Provides real-time updates
 * - Manual Merging: Prefers WebSocket data when available, falls back to HTTP
 *
 * Features:
 * - Request deduplication: Multiple components share one HTTP request
 * - Global rate limiting: All HTTP requests respect 1200 weight/min limit
 * - Real-time updates: WebSocket provides incremental updates
 * - Smart caching: Reduces unnecessary API calls
 *
 * @returns Raw webData2 with loading and error states
 */
export function useWebData2(): UseWebData2Result {
  const { wallet } = useWallet();
  const [mergedData, setMergedData] = useState<WebData2Data | undefined>();

  // Step 1: HTTP fetch initial data using TanStack Query
  const {
    data: httpData,
    isLoading: isHttpLoading,
    error: httpError,
  } = useQuery({
    queryKey: ['webData2', wallet?.address],
    queryFn: async () => {
      if (!wallet) return null;
      return (await infoClient.webData2({ user: wallet.address })) as WebData2Data;
    },
    enabled: !!wallet,
  });

  // Initialize with HTTP data
  useEffect(() => {
    if (httpData) {
      setMergedData(httpData);
    }
  }, [httpData]);

  // Step 2: WebSocket subscription for real-time updates
  const { data: wsData } = useSubscription<WebData2Data>(
    'webData2',
    wallet ? { user: wallet.address } : undefined,
  );

  // Step 3: Prefer WebSocket data when available
  useEffect(() => {
    if (wsData) {
      setMergedData(wsData);
    }
  }, [wsData]);

  return useMemo(
    () => ({
      data: mergedData,
      isLoading: isHttpLoading,
      error: httpError || undefined,
    }),
    [mergedData, isHttpLoading, httpError],
  );
}
