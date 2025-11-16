/**
 * EnsureBuilderFeeUseCase
 *
 * High-level composition UseCase that ensures builder fee is approved
 *
 * This UseCase composes fine-grained UseCases to:
 * 1. Check current builder fee approval status
 * 2. If not approved, request user confirmation
 * 3. Execute approval transaction if confirmed
 * 4. Return approval result or error reason
 *
 * This is a convenience UseCase for cross-context usage (Order context)
 * to simplify the builder fee approval flow before placing orders.
 *
 * Design Pattern: Similar to TryGetAgentWalletUseCase
 * - Composes multiple fine-grained UseCases
 * - Provides single entry point for complex flow
 * - Handles all error cases gracefully
 *
 * Dependencies:
 * - GetBuilderFeeStatusUseCase: For checking approval status
 * - ApproveBuilderFeeUseCase: For executing approval
 * - BuilderFeeConfirmationPort: For requesting user confirmation
 */

import type { Signer } from 'ethers';
import type { GetBuilderFeeStatusUseCase } from './GetBuilderFeeStatusUseCase';
import type { ApproveBuilderFeeUseCase } from './ApproveBuilderFeeUseCase';

/**
 * Command for ensuring builder fee approval
 */
export type EnsureBuilderFeeCommand = {
  /**
   * Signer to sign the approval transaction (if needed)
   */
  signer: Signer;
  /**
   * Wallet address to check approval status for
   */
  walletAddress: string;
};

/**
 * Result of ensuring builder fee approval
 */
export type EnsureBuilderFeeResult = {
  /**
   * Whether builder fee is approved after execution
   */
  isApproved: boolean;
  /**
   * Error reason if approval failed or was cancelled
   */
  errorReason?: string;
};

/**
 * High-level UseCase for ensuring builder fee is approved
 * (with automatic approval flow if needed)
 */
export class EnsureBuilderFeeUseCase {
  constructor(
    private readonly getBuilderFeeStatus: GetBuilderFeeStatusUseCase,
    private readonly approveBuilderFee: ApproveBuilderFeeUseCase,
  ) {}

  /**
   * Execute: Ensure builder fee is approved
   *
   * Flow:
   * 1. Check current approval status
   * 2. If already approved, return success
   * 3. If not approved:
   *    a. Request user confirmation (handled by ApproveBuilderFeeUseCase)
   *    b. Execute approval transaction if confirmed
   *    c. Return result
   *
   * @param command - Command containing signer and wallet address
   * @returns EnsureBuilderFeeResult with approval status or error reason
   */
  async execute(command: EnsureBuilderFeeCommand): Promise<EnsureBuilderFeeResult> {
    try {
      const { signer, walletAddress } = command;

      // 1. Check current builder fee approval status
      const status = await this.getBuilderFeeStatus.execute({ walletAddress });

      if (status.isApproved) {
        // Already approved - no action needed
        return { isApproved: true };
      }

      // 2. Not approved - request confirmation and execute approval
      // ApproveBuilderFeeUseCase handles confirmation dialog internally
      const approved = await this.approveBuilderFee.execute({ signer });

      if (!approved) {
        // User cancelled approval
        return {
          isApproved: false,
          errorReason: 'User cancelled builder fee approval',
        };
      }

      // 3. Approval succeeded
      return { isApproved: true };
    } catch (error) {
      console.error('[EnsureBuilderFeeUseCase] Failed to ensure builder fee approval:', error);
      return {
        isApproved: false,
        errorReason: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
