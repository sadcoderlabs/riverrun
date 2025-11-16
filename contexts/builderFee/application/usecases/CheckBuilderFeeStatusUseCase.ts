/**
 * CheckBuilderFeeStatusUseCase
 *
 * Queries the current builder fee approval status for the active wallet.
 *
 * This use case:
 * - Checks the blockchain for current approval status
 * - Updates the state store with the latest status
 * - Returns the status for immediate use
 *
 * Used for displaying current approval status in UI and checking
 * approval before initiating trading operations.
 */

import type { BuilderFeeStatus } from '../../ports/types';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { BuilderFeeStatePort } from '../ports/BuilderFeeStatePort';
import type { WalletPort } from '../../../wallet/ports/walletPort';
import { BUILDER_CONFIG } from '../../config';

export class CheckBuilderFeeStatusUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
    private readonly state: BuilderFeeStatePort,
  ) {}

  /**
   * Execute the use case
   *
   * @returns Current builder fee approval status
   */
  async execute(): Promise<BuilderFeeStatus> {
    try {
      const wallet = await this.wallet.active();
      if (!wallet) {
        const status: BuilderFeeStatus = {
          maxApprovedFee: 0,
          isApproved: false,
        };
        this.state.updateStatus(status);
        return status;
      }

      // Query max builder fee from exchange
      const maxFee = await this.exchange.getMaxBuilderFee(wallet.address, BUILDER_CONFIG.address);

      const status: BuilderFeeStatus = {
        maxApprovedFee: maxFee,
        isApproved: maxFee >= BUILDER_CONFIG.feeRate,
      };

      this.state.updateStatus(status);
      return status;
    } catch (error) {
      console.error('[CheckBuilderFeeStatusUseCase] Failed to check approval status:', error);
      const status: BuilderFeeStatus = {
        maxApprovedFee: 0,
        isApproved: false,
      };
      this.state.updateStatus(status);
      return status;
    }
  }
}
