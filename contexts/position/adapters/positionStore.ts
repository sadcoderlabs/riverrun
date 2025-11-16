/**
 * Position State Store
 *
 * Zustand store for managing position state in the UI.
 * This adapter allows React components to reactively access position information.
 */

import { createStore } from 'zustand/vanilla';

import type { EnrichedPosition, PositionState } from '../types';

/**
 * Actions for updating position state
 */
interface PositionStateActions {
  /**
   * Set all positions
   */
  setPositions: (positions: EnrichedPosition[]) => void;

  /**
   * Set loading state
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Clear all positions (e.g., when wallet disconnects)
   */
  clear: () => void;
}

/**
 * Initial position state
 */
const initialState: PositionState = {
  positions: [],
  isLoading: false,
};

/**
 * Position state store (vanilla Zustand)
 */
export const positionStore = createStore<PositionState & PositionStateActions>(set => ({
  ...initialState,

  setPositions: (positions: EnrichedPosition[]) =>
    set({
      positions,
    }),

  setLoading: (isLoading: boolean) =>
    set({
      isLoading,
    }),

  clear: () => set(initialState),
}));
