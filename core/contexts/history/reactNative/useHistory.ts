/**
 * useHistory - Public hook for accessing trading history
 *
 * This hook provides access to user's trading history (fills).
 * It automatically starts/stops the history service based on wallet connection.
 *
 * Features:
 * - Automatic lifecycle management (starts when wallet connected, stops when disconnected)
 * - HTTP fetch for initial data
 * - WebSocket subscription for real-time updates
 * - Automatic data merging and deduplication
 *
 * @example
 * ```tsx
 * function HistoryTab() {
 *   const { fills, isLoading, error } = useHistory();
 *
 *   if (isLoading) return <Loading />;
 *   if (error) return <Error error={error} />;
 *
 *   return (
 *     <FlatList
 *       data={fills}
 *       renderItem={({ item }) => <FillItem fill={item} />}
 *     />
 *   );
 * }
 * ```
 */

import { useEffect } from 'react';
import { useWalletContext } from '@/core/composition';
import { useHistoryComposition } from './historyComposition';
import { useHistoryStore } from './useHistoryStore';
import type { Fill } from '../ports/types';

export interface UseHistoryResult {
  /** All fills in chronological order (most recent first) */
  fills: Fill[];
  /** Loading state (true if fetching initial data) */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

/**
 * Hook to access trading history
 *
 * Automatically manages lifecycle based on wallet connection:
 * - Starts monitoring when wallet is connected
 * - Stops monitoring when wallet is disconnected
 *
 * @returns Trading history data and state
 */
export function useHistory(): UseHistoryResult {
  const { wallet } = useWalletContext();
  const { historyService } = useHistoryComposition();

  // Automatic lifecycle management
  useEffect(() => {
    if (!wallet?.address) {
      // No wallet, nothing to monitor
      return;
    }

    // Wallet connected, start monitoring
    historyService.start(wallet.address).catch(err => {
      console.error('[useHistory] Failed to start:', err);
    });

    // Cleanup on unmount or wallet change
    return () => {
      historyService.stop().catch(err => {
        console.error('[useHistory] Failed to stop on cleanup:', err);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.address]);

  // Get reactive state from store
  const { fills, isLoading, error } = useHistoryStore();

  return {
    fills,
    isLoading,
    error,
  };
}

// Re-export types for convenience
export type { Fill, FillSide, FillDirection } from '../ports/types';
