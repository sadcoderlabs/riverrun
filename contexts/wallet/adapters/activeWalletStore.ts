import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';
import type { ActiveWallet } from '../ports/types';

interface ActiveWalletState {
  /**
   * The currently active wallet.
   * undefined when no wallet is connected or ready.
   */
  wallet: ActiveWallet | undefined;

  /**
   * Set the active wallet (called by WalletService)
   */
  setWallet: (wallet: ActiveWallet | undefined) => void;
}

/**
 * Active Wallet Store (Vanilla Zustand)
 *
 * Manages the currently active wallet state.
 * This store is updated by WalletService and consumed by UI components.
 *
 * Architecture:
 * - WalletService computes the active wallet based on business logic
 * - WalletService updates this store whenever active wallet changes
 * - UI components subscribe to this store for reactive updates
 *
 * This is part of the adapters layer - it adapts React's reactive model
 * to the vanilla WalletService.
 */
export const activeWalletStore = createStore<ActiveWalletState>(set => ({
  wallet: undefined,
  setWallet: wallet => set({ wallet }),
}));

/**
 * React hook for accessing active wallet store
 *
 * This binds the vanilla store to React, allowing components to subscribe
 * to state changes and trigger re-renders.
 *
 * @example
 * ```tsx
 * const wallet = useActiveWalletStore(state => state.wallet);
 * ```
 */
export const useActiveWalletStore = () => useStore(activeWalletStore);
