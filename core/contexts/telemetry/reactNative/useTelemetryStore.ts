/**
 * useTelemetryStore Hook
 *
 * React hook for accessing telemetry preferences from the Zustand store.
 * Use this for state subscriptions, use useTelemetry() for business operations.
 */

import { useStore } from 'zustand';
import { telemetryStore } from '../adapters/telemetryStore';

/**
 * useTelemetryStore - Access telemetry preferences
 *
 * This hook provides access to the telemetry preference store (isEnabled).
 * Use precise subscriptions to avoid unnecessary re-renders.
 *
 * @example
 * ```tsx
 * import { useTelemetryStore } from '@/core/composition';
 *
 * function TelemetrySettings() {
 *   // Subscribe to enabled status
 *   const isEnabled = useTelemetryStore(state => state.isEnabled);
 *
 *   return (
 *     <View>
 *       <Text>Telemetry: {isEnabled ? 'Enabled' : 'Disabled'}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export const useTelemetryStore = () => useStore(telemetryStore);
