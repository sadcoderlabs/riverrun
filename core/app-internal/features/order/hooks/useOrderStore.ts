/**
 * useOrderStore - State access hook for orders
 *
 * Provides precise subscriptions to order state for optimal performance.
 * Only re-renders when the selected state changes.
 *
 * For business operations, use useOrder instead.
 */

import { useStore } from 'zustand';
import { orderStore } from '../../../../contexts/order/adapters/orderStore';

/**
 * Hook to access order store
 *
 * Use custom selectors for optimal performance.
 * Only subscribes to the fields you actually use.
 *
 * @example
 * ```typescript
 * // Only re-render when orders change
 * const orders = useOrderStore(state => state.orders);
 *
 * // Only re-render when isLoading changes
 * const isLoading = useOrderStore(state => state.isLoading);
 *
 * // Combine multiple fields (re-render when any changes)
 * const { orders, isLoading } = useOrderStore(state => ({
 *   orders: state.orders,
 *   isLoading: state.isLoading,
 * }));
 * ```
 */
export function useOrderStore<T>(
  selector: (state: ReturnType<typeof orderStore.getState>) => T,
): T {
  return useStore(orderStore, selector);
}
