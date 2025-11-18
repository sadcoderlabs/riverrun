/**
 * useReferral - React Hook for Referral Operations
 *
 * This hook provides referral operations with UI integration (Alert dialogs).
 * For state access, use useReferralStore instead for better performance.
 */

import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { REFERRAL_CONFIG } from '@/contexts/referral/config';
import type { ReferralInfo } from '@/contexts/referral/ports/types';

/**
 * Result type for useReferral hook
 */
export interface UseReferralResult {
  /** Referral information */
  referralInfo: ReferralInfo;

  /** Whether user has a referrer */
  hasReferrer: boolean;

  /** Whether operations are in progress (UI state only) */
  isLoading: boolean;

  /**
   * Load referral status from blockchain
   *
   * Fetches the current referral status and updates the hook's state.
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
 * Hook for managing referral operations and state with UI integration
 *
 * This hook provides referral state and operations together.
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadStatus() to initialize.
 *
 * @example
 * ```tsx
 * import { useReferral } from '@/app-internal';
 *
 * const {
 *   hasReferrer,
 *   referralInfo,
 *   setReferrer,
 *   showReferralHint,
 *   loadStatus,
 *   isLoading,
 * } = useReferral();
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
  // Inject UseCases from DI container
  const getReferralStatusUseCase = useContainer(c => c.getReferralStatusUseCase);
  const setReferrerUseCase = useContainer(c => c.setReferrerUseCase);

  // Wallet access (UI layer responsibility)
  const { wallet, getSigner } = useWallet();

  // State management - referral information (presentation layer)
  const [referralInfo, setReferralInfo] = useState<ReferralInfo>({
    referrer: undefined,
    code: undefined,
    cumVlm: '0',
  });

  // UI state management (presentation layer only)
  const [isLoading, setIsLoading] = useState(false);

  // Derived state
  const hasReferrer = referralInfo.referrer !== undefined;

  /**
   * Load referral status from blockchain
   * Updates hook's state after fetching (UI layer responsibility)
   */
  const loadStatus = useCallback(async (): Promise<ReferralInfo> => {
    try {
      setIsLoading(true);

      if (!wallet) {
        const emptyInfo: ReferralInfo = {
          referrer: undefined,
          code: undefined,
          cumVlm: '0',
        };
        // UI layer responsibility: update state
        setReferralInfo(emptyInfo);
        return emptyInfo;
      }

      // Execute use case
      const info = await getReferralStatusUseCase.execute({
        walletAddress: wallet.address,
      });

      // UI layer responsibility: update state
      setReferralInfo(info);
      return info;
    } catch (error) {
      console.error('[useReferral] Failed to load status:', error);
      const emptyInfo: ReferralInfo = {
        referrer: undefined,
        code: undefined,
        cumVlm: '0',
      };
      setReferralInfo(emptyInfo);
      return emptyInfo;
    } finally {
      setIsLoading(false);
    }
  }, [getReferralStatusUseCase, wallet]);

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
                if (!wallet) {
                  Alert.alert('No Wallet', 'Please connect a wallet first.');
                  resolve(false);
                  return;
                }

                try {
                  setIsLoading(true);

                  // Get signer (UI layer responsibility)
                  const signer = await getSigner();

                  // Execute business logic
                  const info = await setReferrerUseCase.execute({
                    signer,
                    code: referralCode,
                  });

                  if (info.code === referralCode) {
                    // UI layer responsibility: update state
                    setReferralInfo(info);

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
    [setReferrerUseCase, wallet, getSigner],
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
    // State
    referralInfo,
    hasReferrer,

    // UI state
    isLoading,

    // Operations
    loadStatus,
    setReferrer,
    showReferralHint,
  };
}
