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

  // Track previous wallet source to include in disconnect events
  const prevSourceRef = useRef<'privy' | 'reown' | undefined>(undefined);

  useEffect(() => {
    const currentAddress = activeWallet?.address;
    const currentSource = activeWallet?.source;
    const previousAddress = prevAddressRef.current;
    const previousSource = prevSourceRef.current;

    // User connected wallet (no previous wallet)
    if (currentAddress && !previousAddress) {
      // Identify user
      void telemetryService.identifyUser({
        address: currentAddress,
        walletSource: currentSource,
      });

      // Track wallet connected event
      if (currentSource) {
        telemetryService.trackEvent('wallet_connected', {
          walletSource: currentSource,
          address: currentAddress,
        });
      }
    }

    // User switched wallet (both addresses exist but different)
    if (currentAddress && previousAddress && currentAddress !== previousAddress) {
      // Identify new user
      void telemetryService.identifyUser({
        address: currentAddress,
        walletSource: currentSource,
      });

      // Track wallet switched event
      telemetryService.trackEvent('wallet_switched', {
        fromAddress: previousAddress,
        toAddress: currentAddress,
      });
    }

    // User disconnected wallet
    if (!currentAddress && previousAddress) {
      // Track wallet disconnected event (before resetting user)
      if (previousSource) {
        telemetryService.trackEvent('wallet_disconnected', {
          walletSource: previousSource,
        });
      }

      void telemetryService.resetUser();
    }

    // Update refs for next comparison
    prevAddressRef.current = currentAddress;
    prevSourceRef.current = currentSource;
  }, [activeWallet, telemetryService]);
}
