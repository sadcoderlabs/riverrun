/**
 * useMarginStore - Margin State Management
 *
 * React Zustand hook for managing margin/leverage state.
 * This store is updated by useMarginSubscription based on activeAssetData WebSocket.
 *
 * Note: This is a UI-only store (not used by core business logic).
 * It uses React hook API (create) instead of vanilla API (createStore).
 */

import { create } from 'zustand';
import type { MarginLeverage } from '../../../../contexts/margin/ports/types';

/**
 * Margin state shape
 */
interface MarginState {
  /** Current margin and leverage settings for selected market */
  marginLeverage: MarginLeverage | undefined;
  /** Loading state (true while fetching initial data) */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

/**
 * Margin state actions
 */
interface MarginStateActions {
  /** Set margin/leverage data */
  setMarginLeverage: (marginLeverage: MarginLeverage | undefined) => void;

  /** Set loading state */
  setLoading: (isLoading: boolean) => void;

  /** Set error state */
  setError: (error: Error | undefined) => void;

  /** Clear all state (reset to initial) */
  clear: () => void;
}

/**
 * Initial state
 */
const initialState: MarginState = {
  marginLeverage: undefined,
  isLoading: false,
  error: undefined,
};

/**
 * Margin Store (React Hook)
 *
 * React Zustand hook for margin state management.
 * Use this hook to access margin state in React components.
 *
 * Note: No persistence needed - margin/leverage is real-time data
 * that should be fetched on each app launch.
 *
 * @example
 * ```typescript
 * // Subscribe to specific state
 * const marginLeverage = useMarginStore(state => state.marginLeverage);
 * const isLoading = useMarginStore(state => state.isLoading);
 *
 * // Update state (from subscription hook)
 * useMarginStore.getState().setMarginLeverage({ leverage: 10, marginMode: 'cross', ... });
 *
 * // Subscribe outside React (from subscription hook)
 * useMarginStore.subscribe(state => {
 *   console.log('Margin changed:', state.marginLeverage);
 * });
 * ```
 */
export const useMarginStore = create<MarginState & MarginStateActions>(set => ({
  ...initialState,

  setMarginLeverage: (marginLeverage: MarginLeverage | undefined) =>
    set({ marginLeverage, isLoading: false, error: undefined }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: Error | undefined) => set({ error, isLoading: false }),

  clear: () => set(initialState),
}));
