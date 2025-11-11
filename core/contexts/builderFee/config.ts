/**
 * Builder Fee Configuration
 *
 * Builder codes allow the app to receive a fee on fills sent on behalf of users.
 * Users must approve a maximum builder fee before orders can include builder fees.
 *
 * @see https://hyperliquid.gitbook.io/hyperliquid-docs/trading/builder-codes
 */

import type { BuilderConfig, BuilderParam } from './ports/types';

/**
 * Builder address that will receive the fees
 * This address must have at least 100 USDC in perps account value
 */
export const BUILDER_ADDRESS = '0x818C4fBd8Eb992f9506a899E61B2c49EE9514D85' as const;

/**
 * Builder fee rate in tenths of a basis point
 * According to Hyperliquid docs: "f is the size of the fee in tenths of a basis point"
 * Formula: (fee_in_percent / 0.001%) = units
 * Example: 0.025% / 0.001% = 25 units
 *
 * Conversion table:
 * - 1 unit = 0.001% (0.1 basis point)
 * - 10 units = 0.01% (1 basis point)
 * - 25 units = 0.025% (2.5 basis points) ← Current setting
 * - 100 units = 0.1% (10 basis points)
 */
export const BUILDER_FEE_RATE = 25 as const;

/**
 * Maximum fee rate to request approval for
 * This is the ceiling of what the builder CAN charge (not what they WILL charge)
 * Max allowed: 0.1% for perps, 1% for spot
 */
export const MAX_FEE_RATE_PERCENT = '0.1%' as const;

/**
 * Builder configuration object
 */
export const BUILDER_CONFIG: BuilderConfig = {
  address: BUILDER_ADDRESS,
  feeRate: BUILDER_FEE_RATE,
  maxFeeRate: MAX_FEE_RATE_PERCENT,
} as const;

/**
 * Get builder parameter for order requests
 * @returns Builder parameter object with address and fee rate
 */
export function getBuilderParam(): BuilderParam {
  return {
    b: BUILDER_ADDRESS,
    f: BUILDER_FEE_RATE,
  } as const;
}
