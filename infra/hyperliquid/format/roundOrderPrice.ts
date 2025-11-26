/**
 * Round price for order submission
 *
 * Uses the shared Hyperliquid price rules from priceCore.
 */

import { applyHyperliquidPriceRules } from './priceCore';

/**
 * Round price according to Hyperliquid rules for order submission
 *
 * Rules:
 * - Prices can have up to 5 significant figures
 * - No more than (6 - szDecimals) decimal places
 * - Integer prices are always allowed, regardless of significant figures
 *
 * @param price - The price to round
 * @param szDecimals - The szDecimals for the asset
 * @returns The rounded price as a string suitable for order submission
 *
 * @example
 * roundOrderPrice(87512.5, 5)   // "87513" (6 sig figs → rounds to 5)
 * roundOrderPrice(0.020905, 0)  // "0.020905" (5 sig figs, 6 decimals allowed)
 * roundOrderPrice(0.020905, 4)  // "0.02" (only 2 decimals allowed)
 */
export function roundOrderPrice(price: number, szDecimals: number): string {
  if (isNaN(price) || price === 0) {
    return '0';
  }

  const result = applyHyperliquidPriceRules(price, szDecimals);
  if (!result) {
    return '0';
  }

  return result.value.toString();
}
