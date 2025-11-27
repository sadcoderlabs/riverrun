/**
 * useCustomerSupportWalletSync Hook
 *
 * Synchronizes wallet state changes with Intercom user login/logout.
 * This hook automatically logs in/out Intercom users when the wallet connects/disconnects.
 *
 * Design:
 * - Uses React hooks for lifecycle management
 * - Monitors activeWallet from React Context and updates Intercom accordingly
 * - Uses manual initialization - only initializes Intercom when needed
 * - Similar pattern to useTelemetryWalletSync
 */

import { useEffect, useRef } from 'react';
import { useWallet } from '../../wallet/hooks/useWallet';
import { useTelemetry } from '../../telemetry/hooks/useTelemetry';
import { useCustomerSupport } from './useCustomerSupport';

/**
 * Synchronize wallet changes with Intercom user login/logout
 *
 * This hook should be called once at the app root level.
 * It will automatically:
 * - Login the user in Intercom when a wallet connects (initializes Intercom if needed)
 * - Logout then login when switching to a different wallet (prevents conversation merging)
 * - Logout the user from Intercom when the wallet disconnects
 *
 * Important: When switching wallets, we MUST logout first to prevent Intercom from
 * automatically merging the previous wallet's conversation history into the new wallet.
 *
 * @example
 * ```tsx
 * function App() {
 *   // Setup wallet sync for customer support
 *   useCustomerSupportWalletSync();
 *
 *   return <YourApp />;
 * }
 * ```
 */
export function useCustomerSupportWalletSync(): void {
  // Get active wallet from React Context
  const { wallet: activeWallet } = useWallet();

  // Get customer support operations
  const { loginUser, logout } = useCustomerSupport();
  const { captureWarning } = useTelemetry();

  // Track previous wallet address to detect changes
  const prevAddressRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const currentAddress = activeWallet?.address;
    const previousAddress = prevAddressRef.current;

    // Scenario 1: User switched to a different wallet
    // We MUST logout first to prevent Intercom from merging conversations
    if (currentAddress && previousAddress && currentAddress !== previousAddress) {
      console.log(
        '[useCustomerSupportWalletSync] Switching wallet:',
        previousAddress,
        '→',
        currentAddress,
      );

      void logout()
        .then(() => {
          console.log(
            '[useCustomerSupportWalletSync] Logged out previous wallet, logging in new wallet',
          );
          return loginUser(currentAddress);
        })
        .catch(error => {
          console.error('[useCustomerSupportWalletSync] Failed to switch wallet:', error);
          captureWarning('Failed to switch wallet in customer support', {
            component: 'useCustomerSupportWalletSync',
            action: 'switchWallet',
            extra: { previousAddress, currentAddress },
          });
        });
    }
    // Scenario 2: User connected first wallet (no previous wallet)
    else if (currentAddress && !previousAddress) {
      console.log('[useCustomerSupportWalletSync] First wallet connected:', currentAddress);

      void loginUser(currentAddress).catch(error => {
        console.error('[useCustomerSupportWalletSync] Failed to login user:', error);
        captureWarning('Failed to login user in customer support', {
          component: 'useCustomerSupportWalletSync',
          action: 'loginUser',
          extra: { currentAddress },
        });
      });
    }
    // Scenario 3: User disconnected wallet
    else if (!currentAddress && previousAddress) {
      console.log('[useCustomerSupportWalletSync] Wallet disconnected:', previousAddress);

      void logout().catch(error => {
        console.error('[useCustomerSupportWalletSync] Failed to logout:', error);
        captureWarning('Failed to logout from customer support', {
          component: 'useCustomerSupportWalletSync',
          action: 'logout',
          extra: { previousAddress },
        });
      });
    }

    // Update ref for next comparison
    prevAddressRef.current = currentAddress;
  }, [activeWallet, loginUser, logout, captureWarning]);
}
