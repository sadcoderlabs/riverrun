/**
 * Bridge Store Hook
 *
 * Provides direct access to bridge state store for React components.
 * Use custom selectors for optimal performance - only subscribes to the fields you actually use.
 */

import { useStore } from 'zustand';
import { bridgeStore } from '../adapters/bridgeStore';

/**
 * Hook to access bridge store
 *
 * Use this with your own selectors for reactive updates.
 * Only subscribes to the specific fields you select.
 *
 * @example
 * ```typescript
 * // Only re-render when arbitrumBalance changes
 * const arbitrumBalance = useBridgeStore(state => state.arbitrumBalance);
 *
 * // Only re-render when withdrawableBalance changes
 * const withdrawableBalance = useBridgeStore(state => state.withdrawableBalance);
 *
 * // Combine multiple fields (will re-render when any of them changes)
 * const { arbitrumBalance, withdrawableBalance, isLoadingBalances } = useBridgeStore(state => ({
 *   arbitrumBalance: state.arbitrumBalance,
 *   withdrawableBalance: state.withdrawableBalance,
 *   isLoadingBalances: state.isLoadingBalances,
 * }));
 * ```
 */
export function useBridgeStore<T>(
  selector: (state: ReturnType<typeof bridgeStore.getState>) => T,
): T {
  return useStore(bridgeStore, selector);
}
