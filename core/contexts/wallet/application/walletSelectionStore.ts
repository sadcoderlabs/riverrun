import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { WalletSource } from '../ports/types';

interface WalletSelectionState {
  /**
   * The wallet source that the user has selected to use.
   * undefined means no explicit selection (will use default priority: Privy > Reown)
   */
  selectedWalletSource: WalletSource | undefined;

  /**
   * Set the user's preferred wallet source
   */
  setSelectedWalletSource: (source: WalletSource) => void;

  /**
   * Clear the wallet selection (will revert to default priority)
   */
  clearSelection: () => void;

  _hasHydrated: boolean;
  _setHasHydrated: (state: boolean) => void;
}

/**
 * Wallet Selection Store
 *
 * Manages user's wallet selection preference with persistence.
 * This store is part of the application layer in hexagonal architecture.
 */
export const useWalletSelectionStore = create<WalletSelectionState>()(
  persist(
    set => ({
      selectedWalletSource: undefined,
      setSelectedWalletSource: source => set({ selectedWalletSource: source }),
      clearSelection: () => set({ selectedWalletSource: undefined }),
      _hasHydrated: false,
      _setHasHydrated: state => set({ _hasHydrated: state }),
    }),
    {
      name: 'wallet-preference-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) state._setHasHydrated(true);
      },
    },
  ),
);
