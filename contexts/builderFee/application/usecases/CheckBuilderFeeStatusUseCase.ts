/**
 * CheckBuilderFeeStatusUseCase
 *
 * Queries the current builder fee approval status for the active wallet.
 *
 * Responsibilities:
 * - Query blockchain for current approval status
 * - Return status information
 *
 * Non-responsibilities:
 * - State management (UI layer responsibility)
 *
 * Used for displaying current approval status in UI and checking
 * approval before initiating trading operations.
 */

import type { BuilderFeeStatus } from '../../ports/types';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { WalletPort } from '../../../wallet/ports/walletPort';
import { BUILDER_CONFIG } from '../../config';

export class CheckBuilderFeeStatusUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
  ) {}

  /**
   * Execute the use case
   *
   * @returns Current builder fee approval status
   */
  async execute(): Promise<BuilderFeeStatus> {
    const wallet = await this.wallet.active();
    if (!wallet) {
      return {
        maxApprovedFee: 0,
        isApproved: false,
      };
    }

    // Query max builder fee from exchange
    const maxFee = await this.exchange.getMaxBuilderFee(wallet.address, BUILDER_CONFIG.address);

    return {
      maxApprovedFee: maxFee,
      isApproved: maxFee >= BUILDER_CONFIG.feeRate,
    };
  }
}
