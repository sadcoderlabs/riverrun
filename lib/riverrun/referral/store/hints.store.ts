import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

/**
 * Store for managing referral hint preferences
 * Tracks whether user wants to see referral hints during trading
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
   * Hydration status flag
   */
  _hasHydrated: boolean;

  /**
   * Set hydration status
   */
  _setHasHydrated: (state: boolean) => void;
}

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
