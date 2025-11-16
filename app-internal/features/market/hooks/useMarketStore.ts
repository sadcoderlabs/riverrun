/**
 * useMarketStore - Market Store Hook
 *
 * Hook to access market store state from React components.
 * Provides precise subscription control for optimal performance.
 */

import { useStore } from 'zustand';
import { marketStore } from '../../../../contexts/market/adapters/marketStore';

/**
 * Hook to access market store
 *
 * Use custom selectors for optimal performance.
 * Only subscribes to the fields you actually use.
 *
 * @example
 * ```typescript
 * // Only re-render when markets array changes
 * const markets = useMarketStore(state => state.markets);
 *
 * // Only re-render when selectedMarket changes
 * const selectedMarket = useMarketStore(state => state.selectedMarket);
 *
 * // Only re-render when favorites change
 * const favorites = useMarketStore(state => state.favorites);
 *
 * // Combine multiple fields (re-render when any changes)
 * const { markets, selectedMarket } = useMarketStore(state => ({
 *   markets: state.markets,
 *   selectedMarket: state.selectedMarket,
 * }));
 * ```
 */
export function useMarketStore<T>(
  selector: (state: ReturnType<typeof marketStore.getState>) => T,
): T {
  return useStore(marketStore, selector);
}
