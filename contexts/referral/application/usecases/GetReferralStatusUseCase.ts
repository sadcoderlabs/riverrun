/**
 * GetReferralStatusUseCase
 *
 * Queries the current referral status for a wallet address.
 *
 * Responsibilities:
 * - Query blockchain for referral information
 * - Return referral info (referrer, code, cumVlm)
 *
 * Non-responsibilities:
 * - Wallet selection (caller responsibility)
 * - State management (UI layer responsibility)
 * - Store updates (UI layer responsibility)
 *
 * Used for displaying referral status in UI and checking
 * referral status before trading operations.
 */

import type { ReferralInfo } from '../../ports/types';
import type { ReferralExchangePort } from '../ports/ReferralExchangePort';

export type GetReferralStatusCommand = {
  /**
   * Wallet address to check referral status for
   */
  walletAddress: string;
};

export class GetReferralStatusUseCase {
  constructor(private readonly exchange: ReferralExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the wallet address
   * @returns Current referral information
   */
  async execute(command: GetReferralStatusCommand): Promise<ReferralInfo> {
    const { walletAddress } = command;

    // Query referral info from exchange
    return await this.exchange.getReferralInfo(walletAddress);
  }
}
