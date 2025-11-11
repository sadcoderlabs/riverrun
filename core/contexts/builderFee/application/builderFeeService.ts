/**
 * BuilderFeeService - Core business logic for builder fee operations
 *
 * This service implements the BuilderFeePort interface and coordinates
 * builder fee approval operations.
 *
 * Design principles:
 * - Pure business logic (no React dependencies, no UI)
 * - Uses adapters for external operations (Hyperliquid SDK)
 * - Updates builderFeeStateStore for reactive UI
 * - Depends on wallet context for wallet information and clients
 */

import * as hl from '@nktkas/hyperliquid';

import type { BuilderFeePort } from '../ports/builderFeePort';
import type { BuilderFeeStatus } from '../ports/types';
import type { WalletPort } from '../../wallet/ports/walletPort';
import { HyperliquidAdapter } from '../../infra/hyperliquid/hyperliquidAdapter';
import { builderFeeStateStore } from '../adapters/builderFeeStateStore';
import { BUILDER_CONFIG } from '../config';

/**
 * BuilderFeeService implementation
 */
export class BuilderFeeService implements BuilderFeePort {
  constructor(
    private readonly walletService: WalletPort,
    private readonly hyperliquidAdapter: HyperliquidAdapter,
  ) {}

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
      const maxFee = await this.hyperliquidAdapter.getMaxBuilderFee(
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
      const wallet = await this.walletService.active();
      if (!wallet) {
        throw new Error('No active wallet');
      }

      // Get signer for blockchain operation
      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();

      // Execute approval
      await this.hyperliquidAdapter.approveBuilderFee(
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
   * Revoke builder fee by setting max fee to 0%
   */
  async revokeBuilderFee(): Promise<boolean> {
    try {
      const wallet = await this.walletService.active();
      if (!wallet) {
        throw new Error('No active wallet');
      }

      // Get signer for blockchain operation
      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();

      // Execute revocation (set max fee to 0%)
      await this.hyperliquidAdapter.approveBuilderFee(signer, '0%', BUILDER_CONFIG.address);

      // Verify revocation succeeded
      const status = await this.checkApprovalStatus();
      return status.maxApprovedFee === 0;
    } catch (error) {
      console.error('[BuilderFeeService] Failed to revoke builder fee:', error);
      throw error;
    }
  }

  /**
   * Check if approval is sufficient for trading
   */
  async isApprovalSufficient(): Promise<boolean> {
    const status = await this.checkApprovalStatus();
    return status.isApproved;
  }
}
