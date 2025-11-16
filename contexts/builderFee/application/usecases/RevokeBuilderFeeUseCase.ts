/**
 * RevokeBuilderFeeUseCase
 *
 * Revokes builder fee approval by setting the maximum fee to 0%.
 *
 * Responsibilities:
 * - Execute revocation transaction on-chain (set max fee to 0%)
 * - Return execution result
 *
 * Non-responsibilities:
 * - Wallet selection (caller responsibility)
 * - State management (UI layer responsibility)
 * - Status verification (caller can query if needed)
 *
 * Primarily used for development/testing purposes.
 * After revocation, users will need to approve again for trading.
 */

import type { Signer } from 'ethers';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import { BUILDER_CONFIG } from '../../config';

/**
 * Command for revoking builder fee approval
 */
export type RevokeBuilderFeeCommand = {
  /**
   * Signer to execute the revocation transaction
   */
  signer: Signer;
};

export class RevokeBuilderFeeUseCase {
  constructor(private readonly exchange: BuilderFeeExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the signer
   * @returns Promise<void> - Throws error if revocation fails
   */
  async execute(command: RevokeBuilderFeeCommand): Promise<void> {
    const { signer } = command;

    // Execute revocation (set max fee to 0%)
    await this.exchange.approveBuilderFee(signer, '0%', BUILDER_CONFIG.address);
  }
}
