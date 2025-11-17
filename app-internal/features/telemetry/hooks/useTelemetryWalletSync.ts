/**
 * useTelemetryWalletSync Hook
 *
 * Synchronizes wallet state changes with telemetry user identification.
 * This hook automatically identifies/resets the telemetry user when the wallet connects/disconnects.
 *
 * Design:
 * - Extracted from TelemetryService to keep the service pure and stateless
 * - Uses React hooks for lifecycle management instead of constructor subscriptions
 * - Subscribes to activeWalletStore changes and updates telemetry accordingly
 */

import { useEffect } from 'react';
import { activeWalletStore } from '../../../../contexts/wallet/adapters/activeWalletStore';
import type { TelemetryPort } from '../../../../contexts/telemetry/ports/telemetryPort';

/**
 * Synchronize wallet changes with telemetry user identification
 *
 * This hook should be called once at the app composition root level.
 * It will automatically:
 * - Identify the user in telemetry when a wallet connects
 * - Reset the user in telemetry when the wallet disconnects
 *
 * @param telemetryService - The telemetry service instance
 *
 * @example
 * ```tsx
 * function TelemetryCompositionProvider({ children }) {
 *   const telemetryService = useMemo(() => new TelemetryService(...), []);
 *
 *   // Setup wallet sync
 *   useTelemetryWalletSync(telemetryService);
 *
 *   return <Context.Provider value={telemetryService}>{children}</Context.Provider>;
 * }
 * ```
 */
export function useTelemetryWalletSync(telemetryService: TelemetryPort): void {
  useEffect(() => {
    // Subscribe to wallet changes
    const unsubscribe = activeWalletStore.subscribe((state, prevState) => {
      const currentAddress = state.wallet?.address;
      const previousAddress = prevState.wallet?.address;

      // User connected wallet (or switched to a different wallet)
      if (currentAddress && currentAddress !== previousAddress) {
        void telemetryService.identifyUser({
          address: currentAddress,
          walletSource: state.wallet?.source,
        });
      }

      // User disconnected wallet
      if (!currentAddress && previousAddress) {
        void telemetryService.resetUser();
      }
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [telemetryService]);
}
