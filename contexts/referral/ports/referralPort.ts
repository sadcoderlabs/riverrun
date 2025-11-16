/**
 * Referral Port - Business Logic Interface
 *
 * This port defines the business operations for referral management.
 * It abstracts the core business logic from implementation details.
 */

import type { ReferralInfo } from './types';

/**
 * Referral Port Interface
 *
 * Provides operations for managing referral codes on Hyperliquid.
 * Referral codes allow users to receive fee discounts when trading.
 */
export interface ReferralPort {
  /**
   * Check referral status for the current user
   *
   * @returns Referral information including referrer, code, and cumulative volume
   */
  checkStatus(): Promise<ReferralInfo>;

  /**
   * Set referrer code for the user
   *
   * This is a one-time operation and cannot be changed.
   * The user must not have a referrer already set.
   *
   * @param code - Referral code to set (if not provided, uses default)
   * @returns Updated referral information
   * @throws Error if user already has a referrer or operation fails
   */
  setReferrer(code?: string): Promise<ReferralInfo>;
}
