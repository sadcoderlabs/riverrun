/**
 * RevokeBuilderFeeUseCase
 *
 * Revokes builder fee approval by setting the maximum fee to 0%.
 *
 * This use case:
 * - Executes a transaction to set max builder fee to 0%
 * - Verifies the revocation succeeded
 * - Updates the state store
 * - Returns success/failure status
 *
 * Primarily used for development/testing purposes.
 * After revocation, users will need to approve again for trading.
 */

import type { BuilderFeeStatus } from '../../ports/types';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { BuilderFeeStatePort } from '../ports/BuilderFeeStatePort';
import type { WalletPort } from '../../../wallet/ports/walletPort';
import { BUILDER_CONFIG } from '../../config';

export class RevokeBuilderFeeUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
    private readonly state: BuilderFeeStatePort,
  ) {}

  /**
   * Execute the use case
   *
   * @returns true if revocation succeeded, false otherwise
   */
  async execute(): Promise<boolean> {
    try {
      const wallet = await this.wallet.active();
      if (!wallet) {
        throw new Error('No active wallet');
      }

      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();

      // Execute revocation (set max fee to 0%)
      await this.exchange.approveBuilderFee(signer, '0%', BUILDER_CONFIG.address);

      // Verify revocation succeeded
      const maxFee = await this.exchange.getMaxBuilderFee(wallet.address, BUILDER_CONFIG.address);

      const status: BuilderFeeStatus = {
        maxApprovedFee: maxFee,
        isApproved: false,
      };

      this.state.updateStatus(status);

      return maxFee === 0;
    } catch (error) {
      console.error('[RevokeBuilderFeeUseCase] Failed to revoke builder fee:', error);
      throw error;
    }
  }
}
