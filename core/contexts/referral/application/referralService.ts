/**
 * ReferralService - Core business logic for referral operations
 *
 * This service implements the ReferralPort interface and coordinates
 * referral code management operations.
 *
 * Design principles:
 * - Pure business logic (no React dependencies, no UI)
 * - Uses adapters for external operations (Hyperliquid SDK)
 * - Updates referralStateStore for reactive UI
 * - Depends on wallet context for wallet information
 */

import type { Signer } from 'ethers';

import type { ReferralPort } from '../ports/referralPort';
import type { ReferralInfo } from '../ports/types';
import type { WalletPort } from '../../wallet/ports/walletPort';
import { HyperliquidAdapter } from '../../../infra/hyperliquid/hyperliquidAdapter';
import { referralStateStore } from '../adapters/referralStateStore';
import { REFERRAL_CONFIG } from '../config';

/**
 * ReferralService implementation
 */
export class ReferralService implements ReferralPort {
  constructor(
    private readonly walletService: WalletPort,
    private readonly hyperliquidAdapter: HyperliquidAdapter,
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
   * Check referral status for current user
   */
  async checkStatus(): Promise<ReferralInfo> {
    try {
      const wallet = await this.walletService.active();
      if (!wallet) {
        const emptyInfo: ReferralInfo = {
          referrer: undefined,
          code: undefined,
          cumVlm: '0',
        };
        referralStateStore.getState().updateReferralInfo(emptyInfo);
        return emptyInfo;
      }

      // Query referral info from blockchain
      const info = await this.hyperliquidAdapter.getReferralInfo(wallet.address);

      // Update store
      referralStateStore.getState().updateReferralInfo(info);
      return info;
    } catch (error) {
      console.error('[ReferralService] Failed to check status:', error);
      const emptyInfo: ReferralInfo = {
        referrer: undefined,
        code: undefined,
        cumVlm: '0',
      };
      referralStateStore.getState().updateReferralInfo(emptyInfo);
      return emptyInfo;
    }
  }

  /**
   * Set referrer code for the user
   */
  async setReferrer(code?: string): Promise<ReferralInfo> {
    try {
      const referralCode = code || REFERRAL_CONFIG.code;
      const signer = await this.getSigner();

      // Set referrer on blockchain
      await this.hyperliquidAdapter.setReferrer(signer, referralCode);

      // Verify by checking status
      const info = await this.checkStatus();

      if (info.code !== referralCode) {
        throw new Error('Referral code was not confirmed on blockchain');
      }

      return info;
    } catch (error) {
      console.error('[ReferralService] Failed to set referrer:', error);
      throw error;
    }
  }
}
