/**
 * CheckBuilderFeeStatusUseCase
 *
 * Queries the current builder fee approval status for a wallet address.
 *
 * Responsibilities:
 * - Query blockchain for current approval status
 * - Return status information
 *
 * Non-responsibilities:
 * - Wallet selection (caller responsibility)
 * - State management (UI layer responsibility)
 *
 * Used for displaying current approval status in UI and checking
 * approval before initiating trading operations.
 */

import type { BuilderFeeStatus } from '../../ports/types';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import { BUILDER_CONFIG } from '../../config';

/**
 * Command for checking builder fee status
 */
export type CheckBuilderFeeStatusCommand = {
  /**
   * Wallet address to check approval status for
   */
  walletAddress: string;
};

export class CheckBuilderFeeStatusUseCase {
  constructor(private readonly exchange: BuilderFeeExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the wallet address
   * @returns Current builder fee approval status
   */
  async execute(command: CheckBuilderFeeStatusCommand): Promise<BuilderFeeStatus> {
    const { walletAddress } = command;

    // Query max builder fee from exchange
    const maxFee = await this.exchange.getMaxBuilderFee(walletAddress, BUILDER_CONFIG.address);

    return {
      maxApprovedFee: maxFee,
      isApproved: maxFee >= BUILDER_CONFIG.feeRate,
    };
  }
}
