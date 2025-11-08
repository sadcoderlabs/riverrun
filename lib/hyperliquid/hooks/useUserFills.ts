/**
 * Hook to manage user's fill history using unified subscription system
 *
 * Features:
 * - Reference counting: multiple components share one subscription
 * - Global rate limiting: prevents 429 errors
 * - Hybrid strategy: fast HTTP fetch + real-time WebSocket updates
 * - App lifecycle management: automatic pause/resume
 *
 * Returns fills in chronological order (most recent first)
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useSubscription, type UserFillsData } from '../subscription';
import type { Fill } from '../types/fills';
import { useMemo, useState, useCallback } from 'react';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseUserFillsResult {
  /** All fills in chronological order (most recent first) */
  fills: Fill[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
  /** Refetch fills (not implemented in unified subscription) */
  refetch: () => Promise<void>;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useUserFills(): UseUserFillsResult {
  const { wallet } = useActiveWallet();

  // Subscribe using unified subscription system
  const { data, isLoading, error } = useSubscription<UserFillsData>(
    'userFills',
    wallet ? { user: wallet.address } : undefined,
  );

  // Merged fills state (combining HTTP initial data with WebSocket updates)
  const [mergedFills, setMergedFills] = useState<Fill[]>([]);

  // Merge new fills with existing fills when data changes
  useMemo(() => {
    if (!data?.fills) {
      setMergedFills([]);
      return;
    }

    setMergedFills(prevFills => {
      // If this is first data (HTTP fetch), replace all
      if (prevFills.length === 0) {
        return data.fills;
      }

      // Merge new fills with existing (remove duplicates by tid)
      const fillMap = new Map<number, Fill>();

      // Add existing fills
      prevFills.forEach(fill => {
        fillMap.set(fill.tid, fill);
      });

      // Add/update with new fills
      data.fills.forEach(fill => {
        fillMap.set(fill.tid, fill);
      });

      // Convert back to array and sort by time (most recent first)
      return Array.from(fillMap.values()).sort((a, b) => b.time - a.time);
    });
  }, [data?.fills]);

  // Refetch function (no-op in unified subscription system)
  const refetch = useCallback(async () => {
    console.warn('[useUserFills] refetch() is not implemented in unified subscription system');
  }, []);

  return useMemo(
    () => ({
      fills: mergedFills,
      isLoading,
      error,
      refetch,
    }),
    [mergedFills, isLoading, error, refetch],
  );
}

// Re-export types for convenience
export type { Fill } from '../types/fills';
