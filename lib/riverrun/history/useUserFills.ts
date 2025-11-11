/**
 * Hook to manage user's fill history
 *
 * Architecture:
 * - TanStack Query: Handles HTTP fetch with automatic deduplication and caching
 * - WebSocket Subscription: Provides real-time fill updates
 * - Manual Merging: Combines HTTP initial data with WebSocket incremental updates
 *
 * Features:
 * - Request deduplication: Multiple components share one HTTP request
 * - Global rate limiting: All HTTP requests respect 1200 weight/min limit
 * - Real-time updates: WebSocket provides incremental fills
 * - Smart caching: Reduces unnecessary API calls
 *
 * Returns fills in chronological order (most recent first)
 */

import { useWalletContext } from '@/core/composition';
import { useSubscription, type UserFillsData } from '@/lib/hyperliquid/subscription';
import type { Fill } from '@/lib/riverrun/history/fills';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as infoClient from '@/lib/hyperliquid/client/infoClient';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseUserFillsResult {
  /** All fills in chronological order (most recent first) */
  fills: Fill[];
  /** Loading state (true if either HTTP or WS is loading) */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useUserFills(): UseUserFillsResult {
  const { wallet } = useWalletContext();
  const [mergedFills, setMergedFills] = useState<Fill[]>([]);

  // Step 1: HTTP fetch initial fills using TanStack Query
  // - Automatic deduplication across components
  // - Smart caching (30s stale time from queryClient config)
  // - Rate limited via infoClient wrapper
  const {
    data: httpData,
    isLoading: isHttpLoading,
    error: httpError,
  } = useQuery({
    queryKey: ['userFills', wallet?.address],
    queryFn: async () => {
      if (!wallet) return null;
      const fills = (await infoClient.userFills({ user: wallet.address })) as Fill[];
      return fills.sort((a, b) => b.time - a.time);
    },
    enabled: !!wallet,
  });

  // Initialize mergedFills with HTTP data
  useEffect(() => {
    if (httpData) {
      setMergedFills(httpData);
    }
  }, [httpData]);

  // Step 2: WebSocket subscription for real-time incremental updates
  // - Managed by SubscriptionManager (automatic deduplication)
  // - Receives new fills as they occur
  const { data: wsData } = useSubscription<UserFillsData>(
    'userFills',
    wallet ? { user: wallet.address } : undefined,
  );

  // Step 3: Merge WebSocket incremental updates with existing fills
  useEffect(() => {
    if (wsData?.fills && wsData.fills.length > 0) {
      setMergedFills(prevFills => {
        // Merge using Map to deduplicate by tid
        const fillMap = new Map<number, Fill>();

        // Add existing fills
        prevFills.forEach(fill => fillMap.set(fill.tid, fill));

        // Add/update with new fills from WebSocket
        wsData.fills.forEach(fill => fillMap.set(fill.tid, fill));

        // Convert back to array and sort by time (most recent first)
        return Array.from(fillMap.values()).sort((a, b) => b.time - a.time);
      });
    }
  }, [wsData?.fills]);

  return {
    fills: mergedFills,
    isLoading: isHttpLoading,
    error: httpError || undefined,
  };
}

// Re-export types for convenience
export type { Fill } from '@/lib/riverrun/history/fills';
