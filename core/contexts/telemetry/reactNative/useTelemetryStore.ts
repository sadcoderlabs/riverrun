/**
 * useTelemetryStore Hook
 *
 * React hook for accessing telemetry state from the Zustand store.
 * Use this for state subscriptions, use useTelemetry() for business operations.
 */

import { useStore } from 'zustand';
import { telemetryStore } from '../adapters/telemetryStore';

/**
 * useTelemetryStore - Access telemetry state
 *
 * This hook provides access to the telemetry state store with precise
 * subscriptions to avoid unnecessary re-renders.
 *
 * @example
 * ```tsx
 * import { useTelemetryStore } from '@/core/composition';
 *
 * function TelemetrySettings() {
 *   // Subscribe to specific state slices
 *   const userId = useTelemetryStore(state => state.userId);
 *   const isEnabled = useTelemetryStore(state => state.isEnabled);
 *
 *   return (
 *     <View>
 *       <Text>User ID: {userId || 'Not identified'}</Text>
 *       <Text>Telemetry: {isEnabled ? 'Enabled' : 'Disabled'}</Text>
 *     </View>
 *   );
 * }
 * ```
 */
export const useTelemetryStore = () => useStore(telemetryStore);
