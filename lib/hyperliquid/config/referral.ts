/**
 * Referral Configuration
 *
 * Referral codes allow users to receive fee discounts when trading.
 * Setting a referral code is a one-time operation and cannot be changed.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/referrals
 */

/**
 * Default referral code to suggest to users who don't have a referrer
 * Users who set this referral code receive 4% fee discount for first $25M volume
 */
export const DEFAULT_REFERRAL_CODE = 'MOCK_REFERRER_CODE' as const;

/**
 * Referral configuration object
 */
export const REFERRAL_CONFIG = {
  code: DEFAULT_REFERRAL_CODE,
} as const;
