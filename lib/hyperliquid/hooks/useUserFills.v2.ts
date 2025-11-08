/**
 * Hook to manage user's fill history using the unified subscription system
 *
 * NEW VERSION (Phase 2): Uses unified subscription system
 * - Replaces custom subscription logic with useSubscription
 * - Maintains same API for backward compatibility
 * - Handles merging and deduplication of fills
 *
 * Returns fills in chronological order (most recent first)
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useEffect, useState, useMemo } from 'react';
import type { Fill } from '../types/fills';
import { useSubscription } from '../subscription';

// ============================================================================
// Hook Interface (same as v1 for backward compatibility)
// ============================================================================

export interface UseUserFillsResult {
  /** All fills in chronological order (most recent first) */
  fills: Fill[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Merge new fills with existing fills, removing duplicates
 * Fills are identified by their tid (trade ID)
 */
function mergeFills(existingFills: Fill[], newFills: Fill[]): Fill[] {
  // Build a map of existing fills by tid
  const fillMap = new Map<number, Fill>();

  // Add existing fills to map
  existingFills.forEach(fill => {
    fillMap.set(fill.tid, fill);
  });

  // Add/update with new fills
  newFills.forEach(fill => {
    fillMap.set(fill.tid, fill);
  });

  // Convert back to array and sort by time (most recent first)
  return Array.from(fillMap.values()).sort((a, b) => b.time - a.time);
}

// ============================================================================
// Main Hook
// ============================================================================

export function useUserFills(): UseUserFillsResult {
  const { wallet } = useActiveWallet();
  const [fills, setFills] = useState<Fill[]>([]);

  // Subscribe using unified subscription system
  const { data, isLoading, error } = useSubscription<{ fills: Fill[] }>('userFills', {
    user: wallet?.address,
  });

  // Handle initial HTTP data and real-time WebSocket updates
  useEffect(() => {
    if (!data?.fills) return;

    setFills(prevFills => {
      // If this is the first data (from HTTP), replace entirely
      if (prevFills.length === 0) {
        return data.fills;
      }

      // Otherwise, merge with existing fills (deduplication)
      return mergeFills(prevFills, data.fills);
    });
  }, [data]);

  // Reset fills when wallet changes
  useEffect(() => {
    if (!wallet) {
      setFills([]);
    }
  }, [wallet]);

  return useMemo(
    () => ({
      fills,
      isLoading,
      error,
    }),
    [fills, isLoading, error],
  );
}

// Re-export types for convenience
export type { Fill } from '../types/fills';
