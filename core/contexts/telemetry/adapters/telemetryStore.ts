/**
 * Telemetry Store
 *
 * Vanilla Zustand store for managing telemetry state.
 * Persists userId and enabled status to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TelemetryState } from '../ports/types';

/**
 * Create the telemetry store with persistence
 */
export const telemetryStore = createStore<TelemetryState>()(
  persist(
    set => ({
      userId: undefined,
      isInitialized: false,
      isEnabled: true, // Always enabled by default

      setUserId: (userId: string | undefined) => set({ userId }),

      setInitialized: (initialized: boolean) => set({ isInitialized: initialized }),

      setEnabled: (enabled: boolean) => set({ isEnabled: enabled }),
    }),
    {
      name: 'telemetry-storage',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist user preferences, not runtime state
      partialize: state => ({
        userId: state.userId,
        isEnabled: state.isEnabled,
      }),
    },
  ),
);
