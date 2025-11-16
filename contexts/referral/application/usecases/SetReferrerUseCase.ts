/**
 * SetReferrerUseCase
 *
 * Executes set referrer transaction on the blockchain.
 *
 * Responsibilities:
 * - Execute set referrer transaction
 * - Verify the transaction was successful
 *
 * Non-responsibilities:
 * - Wallet selection (caller responsibility)
 * - State management (UI layer responsibility)
 * - User confirmation (UI layer responsibility)
 * - Default code selection (UI layer responsibility)
 *
 * This is a single-purpose use case that only handles the set referrer flow.
 * Callers should handle confirmation dialogs and verification separately.
 */

import type { Signer } from 'ethers';
import type { ReferralInfo } from '../../ports/types';
import type { ReferralExchangePort } from '../ports/ReferralExchangePort';

export type SetReferrerCommand = {
  /**
   * Signer to sign the transaction
   */
  signer: Signer;

  /**
   * Referral code to set
   */
  code: string;
};

export class SetReferrerUseCase {
  constructor(private readonly exchange: ReferralExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the signer and referral code
   * @returns Updated referral information after setting
   * @throws Error if transaction fails or verification fails
   */
  async execute(command: SetReferrerCommand): Promise<ReferralInfo> {
    const { signer, code } = command;

    // 1. Set referrer on blockchain
    await this.exchange.setReferrer(signer, code);

    // 2. Verify by checking status
    const signerAddress = await signer.getAddress();
    const info = await this.exchange.getReferralInfo(signerAddress);

    // 3. Validate the referral code was set correctly
    if (info.code !== code) {
      throw new Error('Referral code was not confirmed on blockchain');
    }

    return info;
  }
}
