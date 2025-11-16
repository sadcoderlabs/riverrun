/**
 * BuilderFeeService - Core business logic for builder fee operations
 *
 * This service implements the BuilderFeePort interface and coordinates
 * builder fee approval operations.
 *
 * Design principles:
 * - Pure business logic (no React dependencies, no UI)
 * - Uses adapters for external operations (Hyperliquid SDK)
 * - Depends on BuilderFeeApprovalConfirmationPort for user confirmation (injected)
 * - Updates builderFeeStateStore for reactive UI
 * - Depends on wallet context for wallet information and clients
 */

import type { Signer } from 'ethers';

import type { BuilderFeePort } from '../ports/builderFeePort';
import type { BuilderFeeStatus } from '../ports/types';
import type { WalletPort } from '../../wallet/ports/walletPort';
import type { BuilderFeeApprovalConfirmationPort } from '../ports/builderFeeApprovalConfirmationPort';
import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import { builderFeeStateStore } from '../adapters/builderFeeStateStore';
import { BUILDER_CONFIG } from '../config';

/**
 * BuilderFeeService implementation
 */
export class BuilderFeeService implements BuilderFeePort {
  constructor(
    private readonly walletService: WalletPort,
    private readonly hyperliquidGateway: HyperliquidGateway,
    private readonly approvalConfirmation: BuilderFeeApprovalConfirmationPort,
  ) {}

  /**
   * Get signer from active wallet
   * @private
   */
  private async getSigner(): Promise<Signer> {
    const wallet = await this.walletService.active();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    const provider = await wallet.getProvider();
    return await provider.getSigner();
  }

  /**
   * Check builder fee approval status
   */
  async checkApprovalStatus(): Promise<BuilderFeeStatus> {
    try {
      const wallet = await this.walletService.active();
      if (!wallet) {
        const status: BuilderFeeStatus = {
          maxApprovedFee: 0,
          isApproved: false,
        };
        builderFeeStateStore.getState().updateStatus(status);
        return status;
      }

      // Use HyperliquidAdapter to check max builder fee
      const maxFee = await this.hyperliquidGateway.getMaxBuilderFee(
        wallet.address,
        BUILDER_CONFIG.address,
      );

      const status: BuilderFeeStatus = {
        maxApprovedFee: maxFee,
        isApproved: maxFee >= BUILDER_CONFIG.feeRate,
      };

      builderFeeStateStore.getState().updateStatus(status);
      return status;
    } catch (error) {
      console.error('[BuilderFeeService] Failed to check approval status:', error);
      const status: BuilderFeeStatus = {
        maxApprovedFee: 0,
        isApproved: false,
      };
      builderFeeStateStore.getState().updateStatus(status);
      return status;
    }
  }

  /**
   * Approve builder fee
   */
  async approveBuilderFee(): Promise<boolean> {
    try {
      const signer = await this.getSigner();

      // Execute approval
      await this.hyperliquidGateway.approveBuilderFee(
        signer,
        BUILDER_CONFIG.maxFeeRate,
        BUILDER_CONFIG.address,
      );

      // Verify approval succeeded
      const status = await this.checkApprovalStatus();
      return status.isApproved;
    } catch (error) {
      console.error('[BuilderFeeService] Failed to approve builder fee:', error);
      throw error;
    }
  }

  /**
   * Ensure builder fee is approved before proceeding
   *
   * This method handles the complete flow:
   * 1. Check if already approved
   * 2. If not approved, request user confirmation via approvalConfirmation port
   * 3. If confirmed, execute approval transaction (with network retry)
   * 4. Verify approval succeeded
   * 5. Return approval status
   *
   * All caller code paths (order placement, closing positions, TP/SL, etc.)
   * automatically get user confirmation when needed.
   *
   * @returns true if approved (already or newly), false if user cancelled or failed
   */
  async ensureApproval(): Promise<boolean> {
    try {
      // 1. Check if already approved
      const status = await this.checkApprovalStatus();
      if (status.isApproved) {
        return true; // Already approved
      }

      // 2. Not approved - request user confirmation
      const confirmed = await this.approvalConfirmation.confirmApproval();

      if (!confirmed) {
        // User cancelled
        console.log('[BuilderFeeService] User cancelled approval');
        return false;
      }

      // 3. User confirmed - execute approval transaction
      // (includes retry logic for network recovery after backgrounding)
      const signer = await this.getSigner();
      await this.hyperliquidGateway.approveBuilderFee(
        signer,
        BUILDER_CONFIG.maxFeeRate,
        BUILDER_CONFIG.address,
      );

      // 4. Verify approval succeeded
      const updatedStatus = await this.checkApprovalStatus();
      return updatedStatus.isApproved;
    } catch (error) {
      console.error('[BuilderFeeService] Failed to ensure approval:', error);
      return false;
    }
  }

  /**
   * Revoke builder fee by setting max fee to 0%
   */
  async revokeBuilderFee(): Promise<boolean> {
    try {
      const signer = await this.getSigner();

      // Execute revocation (set max fee to 0%)
      await this.hyperliquidGateway.approveBuilderFee(signer, '0%', BUILDER_CONFIG.address);

      // Verify revocation succeeded
      const status = await this.checkApprovalStatus();
      return !status.isApproved && status.maxApprovedFee === 0;
    } catch (error) {
      console.error('[BuilderFeeService] Failed to revoke builder fee:', error);
      throw error;
    }
  }
}
