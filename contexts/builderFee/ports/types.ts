/**
 * Builder Fee Types
 *
 * Type definitions for builder fee management in the Hyperliquid ecosystem.
 */

/**
 * Builder configuration
 */
export interface BuilderConfig {
  /**
   * Builder address that will receive fees
   * Must have at least 100 USDC in perps account value
   */
  address: string;

  /**
   * Builder fee rate in tenths of a basis point
   * Formula: (fee_in_percent / 0.001%) = units
   * Example: 0.025% / 0.001% = 25 units
   */
  feeRate: number;

  /**
   * Maximum fee rate to request approval for (as percentage string)
   * This is the ceiling of what the builder CAN charge
   * Max allowed: 0.1% for perps, 1% for spot
   */
  maxFeeRate: string;
}

/**
 * Builder parameter for order requests
 */
export interface BuilderParam {
  /**
   * Builder address
   */
  b: string;

  /**
   * Fee rate in tenths of a basis point
   */
  f: number;
}

/**
 * Builder fee approval status
 */
export interface BuilderFeeStatus {
  /**
   * Maximum approved fee in 0.1bps units
   */
  maxApprovedFee: number;

  /**
   * Whether the approved fee meets the required fee rate
   */
  isApproved: boolean;
}

/**
 * User's effective fee rates (includes discounts + builder fee)
 *
 * All percentage values are in human-readable format (e.g., 0.0682 means 0.0682%)
 */
export interface UserFeeRates {
  /**
   * Effective taker fee rate as percentage (e.g., 0.0682 = 0.0682%)
   * This is the final rate user pays, including discounts and builder fee
   */
  takerFeePercent: number;

  /**
   * Effective maker fee rate as percentage (e.g., 0.0394 = 0.0394%)
   * This is the final rate user pays, including discounts and builder fee
   */
  makerFeePercent: number;

  /**
   * Base taker rate before discounts and builder fee (percentage)
   * Used to show the original rate with strikethrough when user has discounts
   */
  baseTakerPercent: number;

  /**
   * Base maker rate before discounts and builder fee (percentage)
   * Used to show the original rate with strikethrough when user has discounts
   */
  baseMakerPercent: number;

  /**
   * Whether user has an active referral discount
   */
  hasReferralDiscount: boolean;

  /**
   * Whether user has an active staking discount
   */
  hasStakingDiscount: boolean;
}
