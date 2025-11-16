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
