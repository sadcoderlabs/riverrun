/**
 * Referral Hints Store
 *
 * Persisted store for managing referral hint preferences.
 * Tracks whether user wants to see referral hints during trading.
 *
 * This is an adapter layer component that provides persistent storage
 * using React Native AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * State for managing referral hint preferences
 */
interface ReferralHintsState {
  /**
   * Whether to suppress referral hints when user doesn't have a referrer
   * If true, won't show referral setup dialog during trading
   */
  dontHintReferral: boolean;

  /**
   * Set whether to suppress referral hints
   */
  setDontHintReferral: (value: boolean) => void;

  /**
   * Hydration status flag (internal)
   */
  _hasHydrated: boolean;

  /**
   * Set hydration status (internal)
   */
  _setHasHydrated: (state: boolean) => void;
}

/**
 * Referral hints store with persistence
 *
 * Uses AsyncStorage to persist user preference across app sessions.
 */
export const useReferralHintsStore = create<ReferralHintsState>()(
  persist(
    set => ({
      dontHintReferral: false,
      setDontHintReferral: value => set({ dontHintReferral: value }),
      _hasHydrated: false,
      _setHasHydrated: state => set({ _hasHydrated: state }),
    }),
    {
      name: '@riverrun:referral_hints',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) state._setHasHydrated(true);
      },
    },
  ),
);
