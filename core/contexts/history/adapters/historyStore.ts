/**
 * History Store - State management for trading history
 *
 * This store manages the fill history data using Zustand vanilla store.
 * It's framework-independent and can be used from anywhere.
 *
 * Architecture:
 * - Vanilla Zustand store (no React dependency)
 * - Immutable updates
 * - Efficient deduplication by trade ID (tid)
 */

import { createStore } from 'zustand/vanilla';
import type { Fill } from '../ports/types';

/**
 * History store state
 */
export interface HistoryState {
  /** All fills in chronological order (most recent first) */
  fills: Fill[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

/**
 * History store actions
 */
export interface HistoryActions {
  /**
   * Set fills (replaces all existing fills)
   *
   * Fills will be automatically sorted by time (most recent first)
   *
   * @param fills - Array of fills
   */
  setFills: (fills: Fill[]) => void;

  /**
   * Merge new fills with existing fills
   *
   * Deduplicates by trade ID (tid) and sorts by time
   *
   * @param newFills - Array of new fills to merge
   */
  mergeFills: (newFills: Fill[]) => void;

  /**
   * Set loading state
   *
   * @param isLoading - Loading flag
   */
  setLoading: (isLoading: boolean) => void;

  /**
   * Set error state
   *
   * @param error - Error or undefined
   */
  setError: (error: Error | undefined) => void;

  /**
   * Clear all fills and reset state
   */
  clear: () => void;
}

/**
 * Combined store type
 */
export type HistoryStore = HistoryState & HistoryActions;

/**
 * Initial state
 */
const initialState: HistoryState = {
  fills: [],
  isLoading: false,
  error: undefined,
};

/**
 * History store instance
 *
 * This is a singleton vanilla Zustand store
 */
export const historyStore = createStore<HistoryStore>((set, get) => ({
  ...initialState,

  setFills: (fills: Fill[]) => {
    set({
      fills: [...fills].sort((a, b) => b.time - a.time),
    });
  },

  mergeFills: (newFills: Fill[]) => {
    const currentFills = get().fills;

    // Use Map for efficient deduplication by tid
    const fillMap = new Map<number, Fill>();

    // Add existing fills
    currentFills.forEach(fill => fillMap.set(fill.tid, fill));

    // Add/update with new fills
    newFills.forEach(fill => fillMap.set(fill.tid, fill));

    // Convert back to array and sort by time (most recent first)
    const mergedFills = Array.from(fillMap.values()).sort((a, b) => b.time - a.time);

    set({ fills: mergedFills });
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: Error | undefined) => {
    set({ error });
  },

  clear: () => {
    set(initialState);
  },
}));
