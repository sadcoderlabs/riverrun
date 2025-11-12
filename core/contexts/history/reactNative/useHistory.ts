/**
 * useHistory - Public hook for accessing trading history
 *
 * This hook provides access to user's trading history (fills).
 * The lifecycle is managed automatically by HistoryCompositionProvider.
 *
 * Features:
 * - Reactive state from historyStore
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
 * Returns reactive state from the history store.
 * Lifecycle is managed by HistoryCompositionProvider.
 *
 * @returns Trading history data and state
 */
export function useHistory(): UseHistoryResult {
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
