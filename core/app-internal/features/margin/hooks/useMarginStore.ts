/**
 * useMarginStore - Margin State Access Hook
 *
 * Provides reactive access to margin store state for React components.
 */

import { useStore } from 'zustand';
import { marginStore } from '../../../../contexts/margin/adapters/marginStore';

/**
 * useMarginStore - Subscribe to margin store state
 *
 * Use this hook to access margin state in React components.
 * Prefer this over useMargin() for state access (better performance).
 *
 * @param selector - Function to select specific state slice
 * @returns Selected state value
 *
 * @example
 * ```typescript
 * // Subscribe to specific state
 * const marginLeverage = useMarginStore(state => state.marginLeverage);
 * const isLoading = useMarginStore(state => state.isLoading);
 *
 * // Use in component
 * if (isLoading || !marginLeverage) {
 *   return <Loading />;
 * }
 *
 * return <div>{marginLeverage.leverage}x {marginLeverage.marginMode}</div>;
 * ```
 */
export function useMarginStore<T>(
  selector: (state: ReturnType<typeof marginStore.getState>) => T,
): T {
  return useStore(marginStore, selector);
}
