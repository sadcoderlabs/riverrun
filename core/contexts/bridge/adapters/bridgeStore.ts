/**
 * Bridge Store - State management for bridge operations
 *
 * This store manages bridge-related data using Zustand vanilla store.
 * It's framework-independent and can be used from anywhere.
 *
 * Architecture:
 * - Vanilla Zustand store (no React dependency)
 * - Immutable updates
 * - Tracks balances on both chains and loading states
 */

import { createStore } from 'zustand/vanilla';

/**
 * Bridge store state
 */
export interface BridgeState {
  /** USDC balance on Arbitrum */
  arbitrumBalance: string | undefined;
  /** Withdrawable USDC balance on Hyperliquid */
  withdrawableBalance: string | undefined;
  /** Loading state for balance fetching */
  isLoadingBalances: boolean;
  /** Error state */
  error: Error | undefined;
}

/**
 * Bridge store actions
 */
export interface BridgeActions {
  /**
   * Set Arbitrum USDC balance
   *
   * @param balance - Balance as formatted string (e.g., "10.5") or undefined
   */
  setArbitrumBalance: (balance: string | undefined) => void;

  /**
   * Set Hyperliquid withdrawable balance
   *
   * @param balance - Balance as formatted string (e.g., "10.5") or undefined
   */
  setWithdrawableBalance: (balance: string | undefined) => void;

  /**
   * Set loading state for balance operations
   *
   * @param isLoading - Loading flag
   */
  setLoadingBalances: (isLoading: boolean) => void;

  /**
   * Set error state
   *
   * @param error - Error or undefined
   */
  setError: (error: Error | undefined) => void;

  /**
   * Clear all balances and reset state
   */
  clear: () => void;
}

/**
 * Combined store type
 */
export type BridgeStore = BridgeState & BridgeActions;

/**
 * Initial state
 */
const initialState: BridgeState = {
  arbitrumBalance: undefined,
  withdrawableBalance: undefined,
  isLoadingBalances: false,
  error: undefined,
};

/**
 * Bridge store instance
 *
 * This is a singleton vanilla Zustand store
 */
export const bridgeStore = createStore<BridgeStore>(set => ({
  ...initialState,

  setArbitrumBalance: (balance: string | undefined) => {
    set({ arbitrumBalance: balance });
  },

  setWithdrawableBalance: (balance: string | undefined) => {
    set({ withdrawableBalance: balance });
  },

  setLoadingBalances: (isLoading: boolean) => {
    set({ isLoadingBalances: isLoading });
  },

  setError: (error: Error | undefined) => {
    set({ error });
  },

  clear: () => {
    set(initialState);
  },
}));
