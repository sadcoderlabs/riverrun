import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { BUILDER_CONFIG } from './config';
import { useHyperliquidClient } from '@/lib/hyperliquid/client/useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import * as infoClient from '@/lib/hyperliquid/client/infoClient';

/**
 * Hook for managing builder fee approval status
 * Provides functions to check, approve, and revoke builder fee
 */
export function useBuilderFee() {
  const { getMasterExchangeClient } = useHyperliquidClient();
  const { wallet } = useActiveWallet();
  const [isBuilderFeeLoading, setIsBuilderFeeLoading] = useState(false);
  const [maxApprovedFee, setMaxApprovedFee] = useState<number>(0);

  /**
   * Check builder fee approval status
   * @returns Maximum approved builder fee in 0.1bps units
   */
  const checkBuilderFeeStatus = useCallback(async (): Promise<number> => {
    try {
      setIsBuilderFeeLoading(true);

      if (!wallet) {
        return 0;
      }

      const maxFee = await infoClient.maxBuilderFee({
        user: wallet.address,
        builder: BUILDER_CONFIG.address,
      });

      setMaxApprovedFee(maxFee);
      return maxFee;
    } catch (error) {
      console.error('Failed to check builder fee approval:', error);
      setMaxApprovedFee(0);
      return 0;
    } finally {
      setIsBuilderFeeLoading(false);
    }
  }, [wallet]);

  /**
   * Core approval logic - executes the approval transaction and verifies success
   * Does not show success alert, only error alerts
   * @returns true if approval succeeded, false otherwise
   */
  const executeApproval = useCallback(async (): Promise<boolean> => {
    try {
      setIsBuilderFeeLoading(true);

      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        Alert.alert('Error', 'Failed to get master wallet');
        return false;
      }

      // Approve builder fee
      await masterExchangeClient.approveBuilderFee({
        maxFeeRate: BUILDER_CONFIG.maxFeeRate,
        builder: BUILDER_CONFIG.address,
      });

      // Verify approval
      const maxFee = await checkBuilderFeeStatus();
      if (maxFee >= BUILDER_CONFIG.feeRate) {
        return true;
      } else {
        Alert.alert('Approval Failed', 'Builder fee approval was not confirmed. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Failed to approve builder fee:', error);
      Alert.alert(
        'Approval Failed',
        error instanceof Error ? error.message : 'An error occurred while approving builder fee',
      );
      return false;
    } finally {
      setIsBuilderFeeLoading(false);
    }
  }, [getMasterExchangeClient, checkBuilderFeeStatus]);

  /**
   * Approve builder fee
   * Shows confirmation dialog before approving
   */
  const approveBuilderFee = useCallback(async (): Promise<boolean> => {
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
              const success = await executeApproval();
              if (success) {
                Alert.alert('Success', 'Builder fee approved successfully');
              }
              resolve(success);
            },
          },
        ],
      );
    });
  }, [executeApproval]);

  /**
   * Ensure that the user has approved builder fee for the configured builder.
   * If not approved or approval is insufficient, shows an approval dialog.
   * This is used during trading flow to automatically prompt for approval if needed.
   *
   * @returns true if approved (or user approved successfully), false if user cancelled or approval failed
   */
  const ensureBuilderFeeApproval = useCallback(async (): Promise<boolean> => {
    try {
      setIsBuilderFeeLoading(true);

      if (!wallet) {
        return false;
      }

      // Check if builder fee is already approved with sufficient amount
      const maxFee = await infoClient.maxBuilderFee({
        user: wallet.address,
        builder: BUILDER_CONFIG.address,
      });

      setMaxApprovedFee(maxFee);

      // If approved with sufficient fee rate, no need to request approval again
      if (maxFee >= BUILDER_CONFIG.feeRate) {
        return true;
      }

      // Builder fee not approved or insufficient - show confirmation dialog
      return await new Promise<boolean>(resolve => {
        const feePercentage = (BUILDER_CONFIG.feeRate / 1000).toFixed(3);

        Alert.alert(
          'Builder Fee Approval Required',
          `This app collects a ${feePercentage}% builder fee on trades to support development. You will be redirected to your wallet app to approve the maximum fee. Do you want to continue?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Approve',
              onPress: async () => {
                const success = await executeApproval();
                resolve(success);
              },
            },
          ],
        );
      });
    } catch (error) {
      console.error('Failed to ensure builder fee approval:', error);
      Alert.alert(
        'Error',
        error instanceof Error ? error.message : 'Failed to check builder fee approval',
      );
      return false;
    } finally {
      setIsBuilderFeeLoading(false);
    }
  }, [wallet, executeApproval]);

  /**
   * Revoke builder fee by setting max fee rate to 0%
   * Shows confirmation dialog before revoking
   * This is mainly for development/testing purposes
   */
  const revokeBuilderFee = useCallback(async (): Promise<boolean> => {
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
                setIsBuilderFeeLoading(true);

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
                const maxFee = await checkBuilderFeeStatus();
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
                setIsBuilderFeeLoading(false);
              }
            },
          },
        ],
      );
    });
  }, [getMasterExchangeClient, checkBuilderFeeStatus]);

  return {
    maxApprovedFee,
    isBuilderFeeApproved: maxApprovedFee >= BUILDER_CONFIG.feeRate,
    isBuilderFeeLoading,
    checkBuilderFeeStatus,
    approveBuilderFee,
    ensureBuilderFeeApproval,
    revokeBuilderFee,
  };
}
