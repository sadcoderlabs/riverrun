/**
 * ApproveBuilderFeeUseCase
 *
 * Executes builder fee approval transaction on the blockchain.
 *
 * Responsibilities:
 * - Request user confirmation via confirmation port
 * - Execute approval transaction if confirmed
 *
 * Non-responsibilities:
 * - Status checking (use GetBuilderFeeStatusUseCase)
 * - Wallet selection (caller responsibility)
 * - State management (UI layer responsibility)
 *
 * This is a single-purpose use case that only handles the approval flow.
 * Callers should check approval status separately using GetBuilderFeeStatusUseCase.
 */

import type { Signer } from 'ethers';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { BuilderFeeConfirmationPort } from '../ports/BuilderFeeConfirmationPort';
import { BUILDER_CONFIG } from '../../config';

/**
 * Command for approving builder fee
 */
export type ApproveBuilderFeeCommand = {
  /**
   * Signer to sign the approval transaction
   */
  signer: Signer;
};

export class ApproveBuilderFeeUseCase {
  constructor(
    private readonly exchange: BuilderFeeExchangePort,
    private readonly confirmation: BuilderFeeConfirmationPort,
  ) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the signer
   * @returns true if approval succeeded, false if cancelled
   */
  async execute(command: ApproveBuilderFeeCommand): Promise<boolean> {
    const { signer } = command;

    // Request user confirmation
    const confirmed = await this.confirmation.confirmApproval();
    if (!confirmed) {
      return false;
    }

    // Execute approval transaction
    await this.exchange.approveBuilderFee(
      signer,
      BUILDER_CONFIG.maxFeeRate,
      BUILDER_CONFIG.address,
    );

    return true;
  }
}
