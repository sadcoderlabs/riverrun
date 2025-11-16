/**
 * ReferralExchangePort
 *
 * Out port for referral operations on the exchange.
 * This port abstracts the interaction with the Hyperliquid exchange
 * for referral operations.
 *
 * Implementations should handle:
 * - Querying referral information from blockchain
 * - Executing set referrer transactions
 */

import type { Signer } from 'ethers';
import type { ReferralInfo } from '../../ports/types';

export interface ReferralExchangePort {
  /**
   * Get referral information for a user
   *
   * @param userAddress - User wallet address
   * @returns Referral information including referrer, code, and cumulative volume
   */
  getReferralInfo(userAddress: string): Promise<ReferralInfo>;

  /**
   * Set referrer code for the user
   *
   * This is a one-time operation and cannot be changed.
   * The user must not have a referrer already set.
   *
   * @param signer - Signer for the wallet
   * @param code - Referral code to set
   * @throws Error if user already has a referrer or operation fails
   */
  setReferrer(signer: Signer, code: string): Promise<void>;
}
