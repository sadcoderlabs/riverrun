import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useContainer } from '@/core/app-internal/di';
import { BUILDER_CONFIG } from '../config';

export interface UseBuilderFeeResult {
  /**
   * Loading state for builder fee operations (UI state only)
   */
  isLoading: boolean;

  /**
   * Load builder fee approval status from blockchain
   *
   * Updates the builderFeeStateStore with the current approval status.
   * This method must be called manually to initialize or refresh builder fee state.
   *
   * @returns Promise resolving to the max approved fee amount
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   loadBuilderFeeStatus();
   * }, [loadBuilderFeeStatus]);
   * ```
   */
  loadBuilderFeeStatus: () => Promise<number>;

  /**
   * Approve builder fee
   * Shows confirmation dialog before approving
   * @returns true if approval succeeded, false if cancelled or failed
   */
  approveBuilderFee: () => Promise<boolean>;

  /**
   * Ensure builder fee is approved before proceeding
   * If not approved, automatically shows approval dialog
   * Used in trading flow
   * @returns true if approved (or user approved successfully), false if cancelled or failed
   */
  ensureBuilderFeeApproval: () => Promise<boolean>;

  /**
   * Revoke builder fee
   * Shows confirmation dialog before revoking
   * @returns true if revocation succeeded, false if cancelled or failed
   */
  revokeBuilderFee: () => Promise<boolean>;
}

/**
 * useBuilderFee - Builder fee business operations hook
 *
 * This hook provides builder fee-related business operations.
 * For state access, use useBuilderFeeStore instead for better performance.
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadBuilderFeeStatus() to initialize.
 *
 * Provides:
 * - Builder fee operations (approve, revoke, load status, ensure approval)
 * - UI interactions (confirmation dialogs)
 * - UI loading state
 *
 * @example
 * ```tsx
 * import { useBuilderFeeStore, useBuilderFee } from '@/core/composition';
 *
 * // State access - precise subscriptions
 * const isApproved = useBuilderFeeStore(state => state.isApproved);
 * const maxApprovedFee = useBuilderFeeStore(state => state.maxApprovedFee);
 *
 * // Business operations
 * const { approveBuilderFee, loadBuilderFeeStatus, isLoading } = useBuilderFee();
 *
 * // Load data on mount
 * useEffect(() => {
 *   loadBuilderFeeStatus();
 * }, [loadBuilderFeeStatus]);
 *
 * if (!isApproved) {
 *   return (
 *     <Button onPress={approveBuilderFee} loading={isLoading}>
 *       Approve Builder Fee
 *     </Button>
 *   );
 * }
 * ```
 */
export function useBuilderFee(): UseBuilderFeeResult {
  const builderFeeService = useContainer(c => c.builderFeeService);

  // UI state management (presentation layer only)
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load builder fee status from blockchain
   */
  const loadBuilderFeeStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      const status = await builderFeeService.checkApprovalStatus();
      return status.maxApprovedFee;
    } finally {
      setIsLoading(false);
    }
  }, [builderFeeService]);

  /**
   * Core approval logic - executes the approval transaction and verifies success
   * Does not show success alert, only error alerts
   */
  const executeApproval = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);
      const success = await builderFeeService.approveBuilderFee();

      if (!success) {
        Alert.alert('Approval Failed', 'Builder fee approval was not confirmed. Please try again.');
      }

      return success;
    } catch (error) {
      console.error('Failed to approve builder fee:', error);
      Alert.alert(
        'Approval Failed',
        error instanceof Error ? error.message : 'An error occurred while approving builder fee',
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [builderFeeService]);

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
   * Ensure builder fee is approved before proceeding
   * If not approved, automatically shows approval dialog
   */
  const ensureBuilderFeeApproval = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      // Check if builder fee is already approved with sufficient amount
      const status = await builderFeeService.checkApprovalStatus();
      const isApproved = status.isApproved;

      if (isApproved) {
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
      setIsLoading(false);
    }
  }, [builderFeeService, executeApproval]);

  /**
   * Revoke builder fee
   * Shows confirmation dialog before revoking
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
                setIsLoading(true);
                const success = await builderFeeService.revokeBuilderFee();

                if (success) {
                  Alert.alert('Success', 'Builder fee revoked successfully');
                } else {
                  Alert.alert('Error', 'Builder fee revoke was not confirmed');
                }

                resolve(success);
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
  }, [builderFeeService]);

  return {
    isLoading,
    loadBuilderFeeStatus,
    approveBuilderFee,
    ensureBuilderFeeApproval,
    revokeBuilderFee,
  };
}
