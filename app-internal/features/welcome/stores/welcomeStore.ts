import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface WelcomeState {
  /** Whether welcome screens have been seen on this device */
  seenOnDevice: boolean;
  /** List of wallet addresses that have seen welcome screens */
  seenWalletAddresses: string[];
  /** Mark welcome screens as seen for device and wallet address */
  markSeen: (address: string) => void;
  /** Check if welcome should be shown for a given address */
  shouldShowWelcome: (address: string | undefined) => boolean;
  /** Hydration state */
  _hasHydrated: boolean;
  _setHasHydrated: (state: boolean) => void;
}

export const useWelcomeStore = create<WelcomeState>()(
  persist(
    (set, get) => ({
      seenOnDevice: false,
      seenWalletAddresses: [],

      markSeen: (address: string) =>
        set(state => ({
          seenOnDevice: true,
          seenWalletAddresses: state.seenWalletAddresses.includes(address)
            ? state.seenWalletAddresses
            : [...state.seenWalletAddresses, address],
        })),

      shouldShowWelcome: (address: string | undefined) => {
        if (!address) return false;
        const state = get();
        // Show if either: first time on device OR first time with this wallet
        return !state.seenOnDevice || !state.seenWalletAddresses.includes(address);
      },

      _hasHydrated: false,
      _setHasHydrated: state => set({ _hasHydrated: state }),
    }),
    {
      name: 'welcome-screens-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) state._setHasHydrated(true);
      },
    },
  ),
);
