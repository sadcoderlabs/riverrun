/**
 * useReferralContext - React Hook for Referral Operations
 *
 * This hook provides referral operations with UI integration (Alert dialogs).
 * It wraps the pure business logic from ReferralService with presentation layer concerns.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useStore } from 'zustand';

import { useReferralComposition } from './referralComposition';
import { referralStateStore } from '../adapters/referralStateStore';
import { REFERRAL_CONFIG } from '../config';
import type { ReferralInfo } from '../ports/types';

/**
 * Result type for useReferralContext hook
 */
export interface UseReferralContextResult {
  /** Current referral information */
  referralInfo: ReferralInfo;
  /** Whether user has a referrer */
  hasReferrer: boolean;
  /** Whether operations are in progress */
  isLoading: boolean;
  /** Check referral status */
  checkStatus: () => Promise<ReferralInfo>;
  /** Set referrer code (shows confirmation dialog) */
  setReferrer: (code?: string) => Promise<boolean>;
  /** Show referral hint dialog */
  showReferralHint: (
    onResponse?: (result: { set: boolean; dontAskAgain: boolean }) => void,
  ) => Promise<boolean>;
}

/**
 * Hook for managing referral operations with UI integration
 */
export function useReferralContext(): UseReferralContextResult {
  const { referralService } = useReferralComposition();
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to referral state store
  const { referralInfo, hasReferrer } = useStore(referralStateStore);

  /**
   * Check referral status for current user
   */
  const checkStatus = useCallback(async (): Promise<ReferralInfo> => {
    try {
      setIsLoading(true);
      return await referralService.checkStatus();
    } catch (error) {
      console.error('[useReferralContext] Failed to check status:', error);
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
                  console.error('[useReferralContext] Failed to set referrer:', error);
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
    referralInfo,
    hasReferrer,
    isLoading,
    checkStatus,
    setReferrer,
    showReferralHint,
  };
}
