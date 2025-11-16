/**
 * Hook to access history store
 *
 * This hook provides reactive access to the history store state.
 * It will trigger re-renders when the store state changes.
 */

import { useStore } from 'zustand';
import { historyStore } from '../../../../contexts/history/adapters/historyStore';
import type { HistoryState } from '../../../../contexts/history/adapters/historyStore';

/**
 * Hook to access history store
 *
 * @returns History store state
 *
 * @example
 * ```tsx
 * function HistoryTab() {
 *   const { fills, isLoading, error } = useHistoryStore();
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
export function useHistoryStore(): HistoryState {
  const fills = useStore(historyStore, state => state.fills);
  const isLoading = useStore(historyStore, state => state.isLoading);
  const error = useStore(historyStore, state => state.error);

  return { fills, isLoading, error };
}
