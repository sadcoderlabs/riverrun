/**
 * Referral Domain Types
 *
 * Types for the referral bounded context.
 */

/**
 * Referral information for a user
 */
export interface ReferralInfo {
  /** Referrer address if user was referred */
  referrer: string | undefined;
  /** Referral code used */
  code: string | undefined;
  /** Cumulative trading volume */
  cumVlm: string;
}

/**
 * Referral state for store
 */
export interface ReferralState {
  /** Current referral information */
  referralInfo: ReferralInfo;
  /** Whether user has a referrer */
  hasReferrer: boolean;
}
