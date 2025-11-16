/**
 * Position React Hooks
 *
 * Provides direct access to position store for React components.
 * Users write their own selectors for optimal performance.
 */

import { useStore } from 'zustand';
import { positionStore } from '../../../../contexts/position/adapters/positionStore';

/**
 * Hook to access position store
 *
 * Use this with your own selectors for reactive updates.
 *
 * @example
 * ```typescript
 * // Get all positions
 * const positions = usePositionStore(state => state.positions);
 *
 * // Get loading state
 * const isLoading = usePositionStore(state => state.isLoading);
 *
 * // Get position count
 * const count = usePositionStore(state => state.positions.length);
 *
 * // Get specific position
 * const btcPosition = usePositionStore(state =>
 *   state.positions.find(p => p.coin === 'BTC')
 * );
 * ```
 */
export function usePositionStore<T>(
  selector: (state: ReturnType<typeof positionStore.getState>) => T,
): T {
  return useStore(positionStore, selector);
}
