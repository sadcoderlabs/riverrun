import { getWalletAddress } from '@nktkas/hyperliquid/signing';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { BUILDER_CONFIG } from '@/lib/hyperliquid/builderFee/config';
import { useHyperliquidClient } from '@/lib/hyperliquid/hooks/useHyperliquidClient';

/**
 * Hook for managing builder fee approval and checking approval status.
 * Builder fees allow the app to collect a small fee on orders placed by users.
 *
 * Users must approve a maximum builder fee before orders can include builder fees.
 * This approval must be done using the master wallet (not an agent wallet).
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes
 */
export function useBuilderFee() {
  const { getMasterExchangeClient, getInfoClient } = useHyperliquidClient();

  /**
   * Check if the user has approved sufficient builder fee for the configured builder
   * @param userAddress - The user's wallet address
   * @returns The maximum approved builder fee rate in 0.1bps units (e.g., 25 = 0.025%)
   */
  const checkBuilderFeeApproval = useCallback(
    async (userAddress: string): Promise<number> => {
      try {
        const infoClient = getInfoClient();

        // Query the max approved builder fee from Hyperliquid
        const maxApprovedFee = await infoClient.maxBuilderFee({
          user: userAddress,
          builder: BUILDER_CONFIG.address,
        });

        return maxApprovedFee;
      } catch (error) {
        console.error('Failed to check builder fee approval:', error);
        return 0; // Return 0 if check fails (not approved)
      }
    },
    [getInfoClient],
  );

  /**
   * Ensure that the user has approved builder fee for the configured builder.
   * If not approved or approval is insufficient, shows an approval dialog.
   *
   * This function follows the same pattern as agent approval:
   * 1. Checks current approval status
   * 2. If insufficient, shows Alert dialog
   * 3. Uses master wallet to approve builder fee
   * 4. Verifies approval succeeded
   *
   * @returns true if approved (or user approved successfully), false if user cancelled or approval failed
   */
  const ensureBuilderFeeApproval = useCallback(async (): Promise<boolean> => {
    try {
      // Get master exchange client (required for approval)
      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        return false;
      }

      // Get user address from the master wallet
      const userAddress = await getWalletAddress(masterExchangeClient.wallet);

      // Check if builder fee is already approved with sufficient amount
      const maxApprovedFee = await checkBuilderFeeApproval(userAddress);

      // If approved with sufficient fee rate, no need to request approval again
      if (maxApprovedFee >= BUILDER_CONFIG.feeRate) {
        return true;
      }

      // Builder fee not approved or insufficient - show confirmation dialog
      return await new Promise<boolean>(resolve => {
        // Calculate fee percentage: fee_rate / 1000 = percentage
        // Example: 25 / 1000 = 0.025%
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
                try {
                  // Approve the builder fee using master wallet
                  await masterExchangeClient.approveBuilderFee({
                    maxFeeRate: BUILDER_CONFIG.maxFeeRate,
                    builder: BUILDER_CONFIG.address,
                  });

                  // Verify that the approval succeeded
                  const maxApprovedFeeAfter = await checkBuilderFeeApproval(userAddress);

                  if (maxApprovedFeeAfter < BUILDER_CONFIG.feeRate) {
                    Alert.alert(
                      'Approval Failed',
                      'Builder fee approval was not confirmed. Please try again.',
                    );
                    resolve(false);
                    return;
                  }

                  resolve(true);
                } catch (error) {
                  console.error('Failed to approve builder fee:', error);
                  Alert.alert(
                    'Approval Failed',
                    error instanceof Error
                      ? error.message
                      : 'An error occurred while approving builder fee',
                  );
                  resolve(false);
                }
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
    }
  }, [getMasterExchangeClient, checkBuilderFeeApproval]);

  return {
    checkBuilderFeeApproval,
    ensureBuilderFeeApproval,
  };
}
