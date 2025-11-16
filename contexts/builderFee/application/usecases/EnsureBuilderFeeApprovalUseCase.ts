/**
 * EnsureBuilderFeeApprovalUseCase
 *
 * Ensures that builder fee approval is in place before proceeding with trading operations.
 *
 * Flow:
 * 1. Check if already approved
 * 2. If not approved, request user confirmation
 * 3. If confirmed, execute approval transaction
 * 4. Verify approval succeeded
 * 5. Return approval status
 *
 * This use case is the main entry point for ensuring builder fee approval
 * in all trading flows (order placement, closing positions, TP/SL, etc.)
 */

import type { BuilderFeeStatus } from '../../ports/types';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { BuilderFeeConfirmationPort } from '../ports/BuilderFeeConfirmationPort';
import type { BuilderFeeStatePort } from '../ports/BuilderFeeStatePort';
import type { WalletPort } from '../../../wallet/ports/walletPort';
import { BUILDER_CONFIG } from '../../config';

export class EnsureBuilderFeeApprovalUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
    private readonly confirmation: BuilderFeeConfirmationPort,
    private readonly state: BuilderFeeStatePort,
  ) {}

  /**
   * Refresh approval status from blockchain
   * @private
   */
  private async refreshStatus(address: string): Promise<BuilderFeeStatus> {
    try {
      const maxFee = await this.exchange.getMaxBuilderFee(address, BUILDER_CONFIG.address);

      const status: BuilderFeeStatus = {
        maxApprovedFee: maxFee,
        isApproved: maxFee >= BUILDER_CONFIG.feeRate,
      };

      this.state.updateStatus(status);
      return status;
    } catch (error) {
      console.error('[EnsureBuilderFeeApprovalUseCase] Failed to refresh status:', error);
      const status: BuilderFeeStatus = {
        maxApprovedFee: 0,
        isApproved: false,
      };
      this.state.updateStatus(status);
      return status;
    }
  }

  /**
   * Execute the use case
   *
   * @returns true if approved (already or newly), false if user cancelled or failed
   */
  async execute(): Promise<boolean> {
    try {
      // Get active wallet
      const wallet = await this.wallet.active();
      if (!wallet) {
        console.warn('[EnsureBuilderFeeApprovalUseCase] No active wallet');
        const status: BuilderFeeStatus = {
          maxApprovedFee: 0,
          isApproved: false,
        };
        this.state.updateStatus(status);
        return false;
      }

      // 1. Check if already approved
      const status = await this.refreshStatus(wallet.address);
      if (status.isApproved) {
        return true; // Already approved
      }

      // 2. Not approved - request user confirmation
      const confirmed = await this.confirmation.confirmApproval();

      if (!confirmed) {
        // User cancelled
        console.log('[EnsureBuilderFeeApprovalUseCase] User cancelled approval');
        return false;
      }

      // 3. User confirmed - execute approval transaction
      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();

      await this.exchange.approveBuilderFee(
        signer,
        BUILDER_CONFIG.maxFeeRate,
        BUILDER_CONFIG.address,
      );

      // 4. Verify approval succeeded
      const updatedStatus = await this.refreshStatus(wallet.address);
      return updatedStatus.isApproved;
    } catch (error) {
      console.error('[EnsureBuilderFeeApprovalUseCase] Failed to ensure approval:', error);
      return false;
    }
  }
}
