/**
 * Round price for order submission to Hyperliquid
 */

import { roundPrice } from './priceCore';

/**
 * Round price according to Hyperliquid rules for order submission
 *
 * @param price - The price to round
 * @param szDecimals - The szDecimals for the asset
 * @returns The rounded price as a string suitable for API submission
 *
 * @example
 * roundOrderPrice(106307.5, 5)  // "106308"
 * roundOrderPrice(0.020905, 0)  // "0.020905"
 * roundOrderPrice(123.445, 4)   // "123.45"
 */
export function roundOrderPrice(price: number, szDecimals: number): string {
  if (!isFinite(price) || price <= 0) {
    return '0';
  }

  return roundPrice(price, szDecimals).toString();
}
