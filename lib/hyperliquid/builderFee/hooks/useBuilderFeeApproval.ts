import { getWalletAddress } from '@nktkas/hyperliquid/signing';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { BUILDER_CONFIG } from '@/lib/hyperliquid/builderFee/config';
import { useHyperliquidClient } from '@/lib/hyperliquid/hooks/useHyperliquidClient';

/**
 * Hook for managing builder fee approval status
 * Provides functions to check, approve, and revoke builder fee
 */
export function useBuilderFeeApproval() {
  const { getMasterExchangeClient, getInfoClient } = useHyperliquidClient();
  const [isLoading, setIsLoading] = useState(false);
  const [maxApprovedFee, setMaxApprovedFee] = useState<number>(0);

  /**
   * Check builder fee approval status
   * @returns Maximum approved builder fee in 0.1bps units
   */
  const checkStatus = useCallback(async (): Promise<number> => {
    try {
      setIsLoading(true);

      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        return 0;
      }

      const userAddress = await getWalletAddress(masterExchangeClient.wallet);
      const infoClient = getInfoClient();

      const maxFee = await infoClient.maxBuilderFee({
        user: userAddress,
        builder: BUILDER_CONFIG.address,
      });

      setMaxApprovedFee(maxFee);
      return maxFee;
    } catch (error) {
      console.error('Failed to check builder fee approval:', error);
      setMaxApprovedFee(0);
      return 0;
    } finally {
      setIsLoading(false);
    }
  }, [getMasterExchangeClient, getInfoClient]);

  /**
   * Approve builder fee
   * Shows confirmation dialog before approving
   */
  const approve = useCallback(async (): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      const feePercentage = (BUILDER_CONFIG.feeRate / 1000).toFixed(3);

      Alert.alert(
        'Approve Builder Fee',
        `This will approve the app to collect up to ${BUILDER_CONFIG.maxFeeRate} builder fee on trades. The actual fee charged is ${feePercentage}%. You will be redirected to your wallet app to sign the approval.`,
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Approve',
            onPress: async () => {
              try {
                setIsLoading(true);

                const masterExchangeClient = await getMasterExchangeClient();
                if (!masterExchangeClient) {
                  Alert.alert('Error', 'Failed to get master wallet');
                  resolve(false);
                  return;
                }

                // Approve builder fee
                await masterExchangeClient.approveBuilderFee({
                  maxFeeRate: BUILDER_CONFIG.maxFeeRate,
                  builder: BUILDER_CONFIG.address,
                });

                // Verify approval
                const maxFee = await checkStatus();
                if (maxFee >= BUILDER_CONFIG.feeRate) {
                  Alert.alert('Success', 'Builder fee approved successfully');
                  resolve(true);
                } else {
                  Alert.alert('Error', 'Builder fee approval was not confirmed');
                  resolve(false);
                }
              } catch (error) {
                console.error('Failed to approve builder fee:', error);
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to approve builder fee',
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
  }, [getMasterExchangeClient, checkStatus]);

  /**
   * Revoke builder fee by setting max fee rate to 0%
   * Shows confirmation dialog before revoking
   * This is mainly for development/testing purposes
   */
  const revoke = useCallback(async (): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      Alert.alert(
        'Revoke Builder Fee',
        'This will set the maximum builder fee to 0%. You will need to approve builder fee again for future trading.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);

                const masterExchangeClient = await getMasterExchangeClient();
                if (!masterExchangeClient) {
                  Alert.alert('Error', 'Failed to get master wallet');
                  resolve(false);
                  return;
                }

                // Revoke by setting max fee to 0%
                await masterExchangeClient.approveBuilderFee({
                  maxFeeRate: '0%',
                  builder: BUILDER_CONFIG.address,
                });

                // Update state
                const maxFee = await checkStatus();
                if (maxFee === 0) {
                  Alert.alert('Success', 'Builder fee revoked successfully');
                  resolve(true);
                } else {
                  Alert.alert('Error', 'Builder fee revoke was not confirmed');
                  resolve(false);
                }
              } catch (error) {
                console.error('Failed to revoke builder fee:', error);
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to revoke builder fee',
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
  }, [getMasterExchangeClient, checkStatus]);

  return {
    maxApprovedFee,
    isApproved: maxApprovedFee >= BUILDER_CONFIG.feeRate,
    isLoading,
    checkStatus,
    approve,
    revoke,
  };
}
