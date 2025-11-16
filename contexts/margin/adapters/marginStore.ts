/**
 * Margin Store - State Management Adapter
 *
 * Zustand vanilla store for managing margin/leverage state.
 * This store is updated by MarginService based on activeAssetData subscriptions.
 */

import { createStore } from 'zustand/vanilla';
import type { MarginLeverage } from '../ports/types';

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
 * Margin Store
 *
 * Vanilla Zustand store for margin state management.
 * Can be used both in core business logic and React components.
 *
 * Note: No persistence needed - margin/leverage is real-time data
 * that should be fetched on each app launch.
 */
export const marginStore = createStore<MarginState & MarginStateActions>(set => ({
  ...initialState,

  setMarginLeverage: (marginLeverage: MarginLeverage | undefined) =>
    set({ marginLeverage, isLoading: false, error: undefined }),

  setLoading: (isLoading: boolean) => set({ isLoading }),

  setError: (error: Error | undefined) => set({ error, isLoading: false }),

  clear: () => set(initialState),
}));
