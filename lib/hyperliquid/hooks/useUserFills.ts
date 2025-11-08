/**
 * Hook to manage user's fill history using a hybrid approach:
 * 1. Fetches initial fills using InfoClient on mount (max 2000 fills)
 * 2. Subscribes to userFills WebSocket for real-time updates
 *
 * Returns fills in chronological order (most recent first)
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Fill } from '../types/fills';
import { useHyperliquidClient } from '../client/useHyperliquidClient';

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
  /** Refetch fills */
  refetch: () => Promise<void>;
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
  const { subscriptionClient, infoClient } = useHyperliquidClient();
  const [fills, setFills] = useState<Fill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch {
        // Silently handle unsubscribe errors
      }
      subscriptionRef.current = null;
    }
  }, []);

  // Fetch fills function
  const fetchFills = useCallback(async (): Promise<Fill[]> => {
    if (!wallet) {
      return [];
    }

    // Fetch user fills (max 2000 most recent fills)
    const response = (await infoClient.userFills({
      user: wallet.address,
    })) as Fill[];

    // Sort by time (most recent first)
    return response.sort((a, b) => b.time - a.time);
  }, [wallet, infoClient]);

  // Refetch function
  const refetch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const newFills = await fetchFills();
      setFills(newFills);
      setIsLoading(false);
    } catch (err) {
      console.error('[useUserFills] Error refetching fills:', err);
      setError(err instanceof Error ? err : new Error('Failed to refetch fills'));
      setIsLoading(false);
    }
  }, [fetchFills]);

  useEffect(() => {
    // Don't subscribe if conditions aren't met
    if (!wallet) {
      setIsLoading(false);
      setFills([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        // Cleanup any existing subscription
        await cleanup();

        // Step 1: Fetch initial fills using InfoClient
        const initialFills = await fetchFills();

        if (isMounted) {
          setFills(initialFills);
        }

        // Step 2: Subscribe to userFills WebSocket for real-time updates

        const subscription = await subscriptionClient.userFills(
          {
            user: wallet.address,
          },
          (data: any) => {
            if (isMounted && data.fills && data.fills.length > 0) {
              // For snapshot (initial load), we already have the data from REST API
              // For real-time updates (isSnapshot: false), merge with existing fills
              if (!data.isSnapshot) {
                setFills(prevFills => mergeFills(prevFills, data.fills as Fill[]));
              }
            }
          },
        );

        subscriptionRef.current = subscription;

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useUserFills] Error setting up subscription:', err);
          setError(err instanceof Error ? err : new Error('Failed to subscribe'));
          setIsLoading(false);
        }
      }
    };

    void setupSubscription();

    // Cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
      void cleanup();
    };
  }, [wallet, cleanup, fetchFills, subscriptionClient]);

  return {
    fills,
    isLoading,
    error,
    refetch,
  };
}

// Re-export types for convenience
export type { Fill } from '../types/fills';
