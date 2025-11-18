/**
 * useTelemetryWalletSync Hook
 *
 * Synchronizes wallet state changes with telemetry user identification.
 * This hook automatically identifies/resets the telemetry user when the wallet connects/disconnects.
 *
 * Design:
 * - Extracted from TelemetryService to keep the service pure and stateless
 * - Uses React hooks for lifecycle management
 * - Monitors activeWallet from React Context and updates telemetry accordingly
 */

import { useEffect, useRef } from 'react';
import { useWallet } from '../../wallet/hooks/useWallet';
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
  // Get active wallet from React Context
  const { wallet: activeWallet } = useWallet();

  // Track previous wallet address to detect changes
  const prevAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentAddress = activeWallet?.address;
    const previousAddress = prevAddressRef.current;

    // User connected wallet (or switched to a different wallet)
    if (currentAddress && currentAddress !== previousAddress) {
      void telemetryService.identifyUser({
        address: currentAddress,
        walletSource: activeWallet?.source,
      });
    }

    // User disconnected wallet
    if (!currentAddress && previousAddress) {
      void telemetryService.resetUser();
    }

    // Update ref for next comparison
    prevAddressRef.current = currentAddress;
  }, [activeWallet, telemetryService]);
}
