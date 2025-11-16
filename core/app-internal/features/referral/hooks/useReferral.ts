/**
 * useReferral - React Hook for Referral Operations
 *
 * This hook provides referral operations with UI integration (Alert dialogs).
 * For state access, use useReferralStore instead for better performance.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useContainer } from '@/core/app-internal/di';
import { REFERRAL_CONFIG } from '../../../../contexts/referral/config';
import type { ReferralInfo } from '../../../../contexts/referral/ports/types';

/**
 * Result type for useReferral hook
 */
export interface UseReferralResult {
  /** Whether operations are in progress (UI state only) */
  isLoading: boolean;
  /**
   * Load referral status from blockchain
   *
   * Updates the referralStateStore with the current referral status.
   * This method must be called manually to initialize or refresh referral state.
   *
   * @returns Promise resolving to the current referral info
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   loadStatus();
   * }, [loadStatus]);
   * ```
   */
  loadStatus: () => Promise<ReferralInfo>;
  /** Set referrer code (shows confirmation dialog) */
  setReferrer: (code?: string) => Promise<boolean>;
  /** Show referral hint dialog */
  showReferralHint: (
    onResponse?: (result: { set: boolean; dontAskAgain: boolean }) => void,
  ) => Promise<boolean>;
}

/**
 * Hook for managing referral operations with UI integration
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadStatus() to initialize.
 *
 * @example
 * ```tsx
 * import { useReferralStore, useReferral } from '@/core/app-internal/di';
 *
 * // State access - precise subscriptions
 * const hasReferrer = useReferralStore(state => state.hasReferrer);
 * const referralInfo = useReferralStore(state => state.referralInfo);
 *
 * // Business operations
 * const { setReferrer, showReferralHint, loadStatus, isLoading } = useReferral();
 *
 * // Load data on mount
 * useEffect(() => {
 *   loadStatus();
 * }, [loadStatus]);
 *
 * if (!hasReferrer) {
 *   return (
 *     <Button onPress={() => setReferrer()} loading={isLoading}>
 *       Set Referrer
 *     </Button>
 *   );
 * }
 * ```
 */
export function useReferral(): UseReferralResult {
  const referralService = useContainer(c => c.referralService);

  // UI state management (presentation layer only)
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load referral status from blockchain
   */
  const loadStatus = useCallback(async (): Promise<ReferralInfo> => {
    try {
      setIsLoading(true);
      return await referralService.checkStatus();
    } catch (error) {
      console.error('[useReferral] Failed to load status:', error);
      return { referrer: undefined, code: undefined, cumVlm: '0' };
    } finally {
      setIsLoading(false);
    }
  }, [referralService]);

  /**
   * Set referrer code (with confirmation dialog)
   */
  const setReferrer = useCallback(
    async (code?: string): Promise<boolean> => {
      const referralCode = code || REFERRAL_CONFIG.code;

      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Set Referral Code',
          `Setting referral code to "${referralCode}" will give you fee discounts. This is a one-time operation and cannot be changed. Continue?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Set Referral',
              onPress: async () => {
                try {
                  setIsLoading(true);

                  // Execute business logic
                  const info = await referralService.setReferrer(referralCode);

                  if (info.code === referralCode) {
                    Alert.alert('Success', `Referral code "${referralCode}" set successfully`);
                    resolve(true);
                  } else {
                    Alert.alert('Error', 'Referral code was not confirmed');
                    resolve(false);
                  }
                } catch (error) {
                  console.error('[useReferral] Failed to set referrer:', error);
                  Alert.alert(
                    'Error',
                    error instanceof Error ? error.message : 'Failed to set referrer',
                  );
                  resolve(false);
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ],
        );
      });
    },
    [referralService],
  );

  /**
   * Show referral hint dialog
   */
  const showReferralHint = useCallback(
    async (
      onResponse?: (result: { set: boolean; dontAskAgain: boolean }) => void,
    ): Promise<boolean> => {
      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Referral Code Setup',
          `Set up referral code "${REFERRAL_CONFIG.code}" to receive fee discounts on your trades. This is optional but recommended.\n\nNote: You can always set it later in Settings > Approval Status.`,
          [
            {
              text: "Don't Ask Again",
              style: 'cancel',
              onPress: () => {
                if (onResponse) {
                  onResponse({ set: false, dontAskAgain: true });
                }
                resolve(false);
              },
            },
            {
              text: 'Skip',
              onPress: () => {
                if (onResponse) {
                  onResponse({ set: false, dontAskAgain: false });
                }
                resolve(false);
              },
            },
            {
              text: 'Set Referral',
              onPress: async () => {
                const success = await setReferrer();
                if (onResponse) {
                  onResponse({ set: success, dontAskAgain: false });
                }
                resolve(success);
              },
            },
          ],
        );
      });
    },
    [setReferrer],
  );

  return {
    isLoading,
    loadStatus,
    setReferrer,
    showReferralHint,
  };
}
