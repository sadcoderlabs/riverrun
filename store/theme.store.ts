import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

export type ThemePreference = 'light' | 'dark' | 'system';

interface ThemeState {
  themePreference: ThemePreference | undefined;
  setThemePreference: (theme: ThemePreference) => void;
  _hasHydrated: boolean; // Zustand persist middleware adds this
  _setHasHydrated: (state: boolean) => void; // Added to satisfy persist type
}

export const useThemeStore = create<ThemeState>()(
  persist(
    set => ({
      themePreference: undefined,
      setThemePreference: theme => set({ themePreference: theme }),
      _hasHydrated: false,
      _setHasHydrated: state => set({ _hasHydrated: state }),
    }),
    {
      name: 'theme-preference-storage', // Unique name for storage
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) state._setHasHydrated(true);
      },
    },
  ),
);
