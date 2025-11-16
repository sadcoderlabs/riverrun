/**
 * Order Store - State management for orders
 *
 * Uses Zustand vanilla store (framework-independent) to manage order state.
 * This store is accessed by the OrderService and exposed through React hooks.
 */

import { createStore } from 'zustand/vanilla';
import type { Order } from '../ports/types';

// ============================================================================
// Store State Interface
// ============================================================================

interface OrderState {
  /**
   * Current open orders for the active wallet
   */
  orders: Order[];

  /**
   * Loading state for initial orders fetch
   */
  isLoading: boolean;
}

// ============================================================================
// Store Actions Interface
// ============================================================================

interface OrderStateActions {
  /**
   * Set all orders (replaces existing orders)
   */
  setOrders: (orders: Order[]) => void;

  /**
   * Update a single order by oid
   */
  updateOrder: (oid: number, order: Order) => void;

  /**
   * Remove an order by oid
   */
  removeOrder: (oid: number) => void;

  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Clear all state (when wallet disconnects)
   */
  clear: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState: OrderState = {
  orders: [],
  isLoading: false,
};

// ============================================================================
// Store Creation
// ============================================================================

/**
 * Order Store - Zustand vanilla store
 *
 * Manages open orders state with atomic updates.
 * Framework-independent and can be used outside React.
 */
export const orderStore = createStore<OrderState & OrderStateActions>(set => ({
  // State
  ...initialState,

  // Actions
  setOrders: (orders: Order[]) => set({ orders }),

  updateOrder: (oid: number, order: Order) =>
    set(state => ({
      orders: state.orders.map(o => (o.oid === oid ? order : o)),
    })),

  removeOrder: (oid: number) =>
    set(state => ({
      orders: state.orders.filter(o => o.oid !== oid),
    })),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  clear: () => set(initialState),
}));
