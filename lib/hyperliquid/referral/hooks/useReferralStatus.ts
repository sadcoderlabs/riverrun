import { getWalletAddress } from '@nktkas/hyperliquid/signing';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { REFERRAL_CONFIG } from '@/lib/hyperliquid/referral/config';
import { useHyperliquidClient } from '@/lib/hyperliquid/client/useHyperliquidClient';

/**
 * Referral information for a user
 */
export interface ReferralInfo {
  /** Referrer address if user was referred */
  referrer: string | undefined;
  /** Referral code used */
  code: string | undefined;
  /** Cumulative trading volume */
  cumVlm: string;
}

/**
 * Hook for managing referral status
 * Provides functions to check and set referrer
 */
export function useReferralStatus() {
  const { getMasterExchangeClient, infoClient } = useHyperliquidClient();
  const [isLoading, setIsLoading] = useState(false);
  const [referralInfo, setReferralInfo] = useState<ReferralInfo>({
    referrer: undefined,
    code: undefined,
    cumVlm: '0',
  });

  /**
   * Check referral status for current user
   * @returns Referral information
   */
  const checkStatus = useCallback(async (): Promise<ReferralInfo> => {
    try {
      setIsLoading(true);

      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        return { referrer: undefined, code: undefined, cumVlm: '0' };
      }

      const userAddress = await getWalletAddress(masterExchangeClient.wallet);

      // Query referral info
      const referral = await infoClient.referral({ user: userAddress });

      const info: ReferralInfo = {
        referrer: referral.referredBy?.referrer,
        code: referral.referredBy?.code,
        cumVlm: referral.cumVlm,
      };

      setReferralInfo(info);
      return info;
    } catch (error) {
      console.error('Failed to check referral status:', error);
      const emptyInfo = { referrer: undefined, code: undefined, cumVlm: '0' };
      setReferralInfo(emptyInfo);
      return emptyInfo;
    } finally {
      setIsLoading(false);
    }
  }, [getMasterExchangeClient, infoClient]);

  /**
   * Set referrer code for the user
   * This is a one-time operation and cannot be changed
   * Shows confirmation dialog before setting
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

                  const masterExchangeClient = await getMasterExchangeClient();
                  if (!masterExchangeClient) {
                    Alert.alert('Error', 'Failed to get master wallet');
                    resolve(false);
                    return;
                  }

                  // Set referrer
                  await masterExchangeClient.setReferrer({ code: referralCode });

                  // Verify by checking status
                  const info = await checkStatus();
                  if (info.code === referralCode) {
                    Alert.alert('Success', `Referral code "${referralCode}" set successfully`);
                    resolve(true);
                  } else {
                    Alert.alert('Error', 'Referral code was not confirmed');
                    resolve(false);
                  }
                } catch (error) {
                  console.error('Failed to set referrer:', error);
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
    [getMasterExchangeClient, checkStatus],
  );

  /**
   * Show referral hint dialog
   * Used to prompt users to set referral code for fee discount
   * @param onResponse Callback with user's choice (true=set, false=skip) and don't ask again preference
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
    hasReferrer: referralInfo.referrer !== undefined,
    isLoading,
    checkStatus,
    setReferrer,
    showReferralHint,
  };
}
