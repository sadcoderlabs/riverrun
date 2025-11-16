/**
 * Telemetry Store
 *
 * Vanilla Zustand store for managing telemetry preferences.
 * Only stores user preference (isEnabled) - all other state is managed in-memory.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { TelemetryState } from '../ports/types';

/**
 * Create the telemetry store with persistence
 * Only persists isEnabled (user preference)
 */
export const telemetryStore = createStore<TelemetryState>()(
  persist(
    set => ({
      isEnabled: true, // Enabled by default

      setEnabled: (enabled: boolean) => set({ isEnabled: enabled }),
    }),
    {
      name: 'telemetry-storage',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
);
