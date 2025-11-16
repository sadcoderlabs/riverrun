import { useWalletContext } from '@/core/composition';
import { useSubscription, type ActiveAssetData } from '../subscription';
import { useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as infoClient from '../client/infoClient';

interface UseActiveAssetDataParams {
  coin: string;
}

interface UseActiveAssetDataResult {
  data: ActiveAssetData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to get Hyperliquid's activeAssetData
 *
 * Architecture:
 * - TanStack Query: Handles HTTP fetch with automatic deduplication and caching
 * - WebSocket Subscription: Provides real-time updates
 * - Manual Merging: Prefers WebSocket data when available, falls back to HTTP
 *
 * Features:
 * - Request deduplication: Multiple components share one HTTP request per coin
 * - Global rate limiting: All HTTP requests respect 1200 weight/min limit
 * - Real-time updates: WebSocket provides incremental updates
 * - Smart caching: Reduces unnecessary API calls
 *
 * @param params - { coin: string }
 * @returns activeAssetData with loading and error states
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { wallet } = useWalletContext();
  const [mergedData, setMergedData] = useState<ActiveAssetData | undefined>();

  // Step 1: HTTP fetch initial data using TanStack Query
  const {
    data: httpData,
    isLoading: isHttpLoading,
    error: httpError,
  } = useQuery({
    queryKey: ['activeAssetData', wallet?.address, coin],
    queryFn: async () => {
      if (!wallet) return null;
      return (await infoClient.activeAssetData({
        coin: coin.toUpperCase(),
        user: wallet.address,
      })) as ActiveAssetData;
    },
    enabled: !!wallet && !!coin,
  });

  // Initialize with HTTP data
  useEffect(() => {
    if (httpData) {
      setMergedData(httpData);
    }
  }, [httpData]);

  // Step 2: WebSocket subscription for real-time updates
  const { data: wsData } = useSubscription<ActiveAssetData>(
    'activeAssetData',
    wallet && coin ? { user: wallet.address, coin } : undefined,
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
