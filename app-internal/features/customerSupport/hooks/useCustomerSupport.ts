/**
 * useCustomerSupport - Customer support operations hook
 *
 * Provides methods to interact with Intercom for customer support.
 * Uses manual initialization approach - Intercom is initialized lazily
 * when the user first opens the support messenger.
 *
 * @example
 * ```tsx
 * import { useCustomerSupport } from '@/app-internal/features/customerSupport';
 *
 * function SupportButton() {
 *   const { openSupport } = useCustomerSupport();
 *
 *   return (
 *     <Button onPress={openSupport}>
 *       Contact Support
 *     </Button>
 *   );
 * }
 * ```
 */

import { useCallback } from 'react';

import {
  openIntercomMessenger,
  loginIntercomUser,
  logoutIntercom,
} from '@/infra/intercom/intercomConfig';

export interface UseCustomerSupportResult {
  /**
   * Open the Intercom messenger
   * Shows the customer support chat interface
   * Automatically initializes Intercom on first call
   */
  openSupport: () => Promise<void>;

  /**
   * Login user in Intercom with user attributes
   * Associates the current session with a user ID (typically wallet address)
   * @param userId - User identifier (wallet address)
   */
  loginUser: (userId: string) => Promise<void>;

  /**
   * Logout from Intercom
   * Clears the current user session
   */
  logout: () => Promise<void>;
}

/**
 * Hook for customer support operations
 */
export function useCustomerSupport(): UseCustomerSupportResult {
  /**
   * Open the Intercom messenger
   * Initializes Intercom on first call (lazy initialization)
   */
  const openSupport = useCallback(async () => {
    try {
      await openIntercomMessenger();
    } catch (error) {
      console.error('[useCustomerSupport] Failed to open support:', error);
      throw error;
    }
  }, []);

  /**
   * Login user in Intercom
   */
  const loginUser = useCallback(async (userId: string) => {
    try {
      await loginIntercomUser(userId);
    } catch (error) {
      console.error('[useCustomerSupport] Failed to login user:', error);
      throw error;
    }
  }, []);

  /**
   * Logout from Intercom
   */
  const logout = useCallback(async () => {
    try {
      await logoutIntercom();
    } catch (error) {
      console.error('[useCustomerSupport] Failed to logout:', error);
      throw error;
    }
  }, []);

  return {
    openSupport,
    loginUser,
    logout,
  };
}
