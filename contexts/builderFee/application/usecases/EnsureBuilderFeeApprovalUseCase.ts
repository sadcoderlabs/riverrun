/**
 * EnsureBuilderFeeApprovalUseCase
 *
 * Ensures that builder fee approval is in place before proceeding with trading operations.
 *
 * Responsibilities:
 * - Check if already approved
 * - Request user confirmation if not approved
 * - Execute approval transaction on-chain
 * - Return approval result
 *
 * Non-responsibilities:
 * - State management (UI layer responsibility)
 *
 * Flow:
 * 1. Check if already approved
 * 2. If not approved, request user confirmation
 * 3. If confirmed, execute approval transaction
 * 4. Return success/failure
 *
 * This use case is the main entry point for ensuring builder fee approval
 * in all trading flows (order placement, closing positions, TP/SL, etc.)
 */

import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { BuilderFeeConfirmationPort } from '../ports/BuilderFeeConfirmationPort';
import type { WalletPort } from '../../../wallet/ports/walletPort';
import { BUILDER_CONFIG } from '../../config';

export class EnsureBuilderFeeApprovalUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
    private readonly confirmation: BuilderFeeConfirmationPort,
  ) {}

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
        return false;
      }

      // 1. Check if already approved
      const maxFee = await this.exchange.getMaxBuilderFee(wallet.address, BUILDER_CONFIG.address);
      const isApproved = maxFee >= BUILDER_CONFIG.feeRate;

      if (isApproved) {
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

      // Transaction succeeded
      return true;
    } catch (error) {
      console.error('[EnsureBuilderFeeApprovalUseCase] Failed to ensure approval:', error);
      return false;
    }
  }
}
