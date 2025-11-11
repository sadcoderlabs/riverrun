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
import { HyperliquidBuilderFeeAdapter } from '../adapters/hyperliquidBuilderFeeAdapter';
import { builderFeeStateStore } from '../adapters/builderFeeStateStore';
import { BUILDER_CONFIG } from '../config';
import * as infoClient from '@/lib/hyperliquid/client/infoClient';
import { getMasterExchangeClient as getMasterExchangeClientGetter } from '@/lib/hyperliquid/client/getter';

/**
 * BuilderFeeService implementation
 */
export class BuilderFeeService implements BuilderFeePort {
  private readonly hyperliquidAdapter: HyperliquidBuilderFeeAdapter;

  constructor(private readonly walletService: WalletPort) {
    this.hyperliquidAdapter = new HyperliquidBuilderFeeAdapter();
  }

  /**
   * Get the master exchange client for approval operations
   */
  private async getMasterExchangeClient(): Promise<hl.ExchangeClient | undefined> {
    try {
      const wallet = await this.walletService.active();
      if (!wallet) {
        return undefined;
      }

      const signer = await this.walletService.getSigner();
      return getMasterExchangeClientGetter(wallet.address, signer);
    } catch (error) {
      console.error('[BuilderFeeService] Failed to get master exchange client:', error);
      return undefined;
    }
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

      // Use the rate-limited infoClient wrapper directly
      const maxFee = await infoClient.maxBuilderFee({
        user: wallet.address,
        builder: BUILDER_CONFIG.address,
      });

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
      const exchangeClient = await this.getMasterExchangeClient();
      if (!exchangeClient) {
        throw new Error('Failed to get master wallet');
      }

      // Execute approval
      await this.hyperliquidAdapter.approveBuilderFee({
        maxFeeRate: BUILDER_CONFIG.maxFeeRate,
        builder: BUILDER_CONFIG.address,
        exchangeClient,
      });

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
      const exchangeClient = await this.getMasterExchangeClient();
      if (!exchangeClient) {
        throw new Error('Failed to get master wallet');
      }

      // Execute revocation (set max fee to 0%)
      await this.hyperliquidAdapter.approveBuilderFee({
        maxFeeRate: '0%',
        builder: BUILDER_CONFIG.address,
        exchangeClient,
      });

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
