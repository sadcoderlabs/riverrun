import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface NotificationPreferenceState {
  /** Whether push notifications are enabled. Defaults to true. */
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  _hasHydrated: boolean;
  _setHasHydrated: (state: boolean) => void;
}

export const useNotificationPreferenceStore = create<NotificationPreferenceState>()(
  persist(
    set => ({
      isEnabled: true,
      setEnabled: enabled => set({ isEnabled: enabled }),
      _hasHydrated: false,
      _setHasHydrated: state => set({ _hasHydrated: state }),
    }),
    {
      name: 'notification-preference-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) state._setHasHydrated(true);
      },
    },
  ),
);
