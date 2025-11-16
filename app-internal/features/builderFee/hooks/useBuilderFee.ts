import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useContainer } from '@/app-internal/di';
import { useWalletContext } from '@/app-internal/features/wallet/hooks/useWalletContext';
import { BUILDER_CONFIG } from '../../../../contexts/builderFee/config';
import { builderFeeStateStore } from '../builderFeeStateStore';

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
 * Architecture:
 * - Uses BuilderFee UseCases from DI container
 * - Provides UI-level confirmation dialogs (in addition to business logic confirmations)
 * - Manages presentation-layer loading state
 *
 * @example
 * ```tsx
 * import { useBuilderFeeStore, useBuilderFee } from '@/app-internal/di';
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
  const getStatusUseCase = useContainer(c => c.getBuilderFeeStatusUseCase);
  const approveUseCase = useContainer(c => c.approveBuilderFeeUseCase);
  const revokeUseCase = useContainer(c => c.revokeBuilderFeeUseCase);

  // Wallet access (for getting wallet address and signer)
  const { wallet, getSigner } = useWalletContext();

  // UI state management (presentation layer only)
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load builder fee status from blockchain
   * Updates UI state store after fetching (UI layer responsibility)
   */
  const loadBuilderFeeStatus = useCallback(async () => {
    if (!wallet) {
      // No wallet connected - set to default state
      const status = { maxApprovedFee: 0, isApproved: false };
      builderFeeStateStore.getState().updateStatus(status);
      return 0;
    }

    setIsLoading(true);
    try {
      const status = await getStatusUseCase.execute({ walletAddress: wallet.address });
      // UI layer responsibility: update state store
      builderFeeStateStore.getState().updateStatus(status);
      return status.maxApprovedFee;
    } finally {
      setIsLoading(false);
    }
  }, [getStatusUseCase, wallet]);

  /**
   * Core approval logic - executes the approval use case
   * Use case handles confirmation dialog internally
   * Does not show success alert, only error alerts
   * Reloads status after successful approval (UI layer responsibility)
   */
  const executeApproval = useCallback(async (): Promise<boolean> => {
    if (!wallet) {
      Alert.alert('No Wallet', 'Please connect a wallet first.');
      return false;
    }

    try {
      setIsLoading(true);

      // Get signer from active wallet (UI layer responsibility)
      const signer = await getSigner();

      const success = await approveUseCase.execute({ signer });

      if (!success) {
        Alert.alert('Approval Failed', 'Builder fee approval was not confirmed. Please try again.');
        return false;
      }

      // UI layer responsibility: reload status to update state
      await loadBuilderFeeStatus();
      return true;
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
  }, [approveUseCase, loadBuilderFeeStatus, wallet, getSigner]);

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
   * Checks status first, then prompts for approval if needed
   * This composes GetBuilderFeeStatusUseCase and ApproveBuilderFeeUseCase
   */
  const ensureBuilderFeeApproval = useCallback(async (): Promise<boolean> => {
    if (!wallet) {
      Alert.alert('No Wallet', 'Please connect a wallet first.');
      return false;
    }

    try {
      setIsLoading(true);

      // 1. Check if already approved
      const status = await getStatusUseCase.execute({ walletAddress: wallet.address });

      if (status.isApproved) {
        return true; // Already approved
      }

      // 2. Not approved - request approval
      const signer = await getSigner();
      const success = await approveUseCase.execute({ signer });

      if (success) {
        // UI layer responsibility: reload status to update state
        await loadBuilderFeeStatus();
      }

      return success;
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
  }, [getStatusUseCase, approveUseCase, loadBuilderFeeStatus, wallet, getSigner]);

  /**
   * Revoke builder fee
   * Shows confirmation dialog before revoking
   * After successful revocation, reloads status to update UI
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

                // Get signer from active wallet (UI layer responsibility)
                const signer = await getSigner();

                // Execute revocation on-chain
                await revokeUseCase.execute({ signer });

                // Reload status to update UI state (UI layer responsibility)
                await loadBuilderFeeStatus();

                Alert.alert('Success', 'Builder fee revoked successfully');
                resolve(true);
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
  }, [revokeUseCase, loadBuilderFeeStatus, getSigner]);

  return {
    isLoading,
    loadBuilderFeeStatus,
    approveBuilderFee,
    ensureBuilderFeeApproval,
    revokeBuilderFee,
  };
}
