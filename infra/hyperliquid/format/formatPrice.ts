/**
 * Format price for UI display
 *
 * Formatting rules:
 * - Apply Hyperliquid price rules first (round to valid price)
 * - If < 5 sig figs: pad with zeros to reach 5 (for visual consistency)
 * - If >= 5 sig figs: show as-is (trailing zeros already removed by Big.js)
 * - Optionally add thousand separators
 */

import Big from 'big.js';
import {
  roundPrice,
  countSigFigs,
  countIntegerDigits,
  getAllowedDecimals,
  MAX_SIG_FIGS,
} from './priceCore';

/**
 * Format price for display according to Hyperliquid rules
 *
 * @param price - Price from API (string or number)
 * @param szDecimals - Asset's szDecimals from Hyperliquid
 * @param thousandsSeparator - Whether to add thousand separators
 * @returns Formatted price string for UI display
 *
 * @example
 * formatPrice(4219, 4, false)      // "4219.0" (pad to 5 sig figs)
 * formatPrice(0.20359, 0, false)   // "0.20359" (already 5 sig figs)
 * formatPrice(114971, 5, true)     // "114,971" (integer, with separator)
 */
export function formatPrice(
  price: string | number,
  szDecimals: number,
  thousandsSeparator: boolean,
): string {
  // Handle zero and invalid input
  if (price === 0 || price === '0') return '0';

  const rounded = roundPrice(price, szDecimals);
  if (rounded.eq(0)) return '0';

  // Format the price
  const formatted = formatWithPadding(rounded, szDecimals);

  // Add thousand separators if requested
  if (thousandsSeparator) {
    return addThousandsSeparator(formatted);
  }

  return formatted;
}

/**
 * Format price with padding to 5 significant figures
 *
 * - If integer part >= 5 digits: show as integer (no padding needed)
 * - If < 5 sig figs: pad with zeros to reach 5 sig figs
 * - If >= 5 sig figs: show as-is
 */
function formatWithPadding(value: Big, szDecimals: number): string {
  const intDigits = countIntegerDigits(value);
  const sigFigs = countSigFigs(value);
  const allowedDecimals = getAllowedDecimals(szDecimals);

  // Large integers: show as integer (no padding)
  if (intDigits >= MAX_SIG_FIGS) {
    return value.round(0).toString();
  }

  // Already has enough sig figs: show as-is
  if (sigFigs >= MAX_SIG_FIGS) {
    return value.toString();
  }

  // Need to pad with zeros to reach 5 sig figs
  const targetSigFigs = MAX_SIG_FIGS;
  const neededDecimals = calculateDecimalsForSigFigs(value, targetSigFigs);
  const finalDecimals = Math.min(neededDecimals, allowedDecimals);

  return value.toFixed(finalDecimals);
}

/**
 * Calculate how many decimal places are needed to display N significant figures
 *
 * @example
 * calculateDecimalsForSigFigs(Big('123'), 5)     // 2 (to get 123.00)
 * calculateDecimalsForSigFigs(Big('0.02'), 5)    // 6 (to get 0.020000)
 * calculateDecimalsForSigFigs(Big('0.020905'), 5) // 6 (already 5 sig figs)
 */
function calculateDecimalsForSigFigs(value: Big, targetSigFigs: number): number {
  if (value.eq(0)) return 0;

  const currentSigFigs = countSigFigs(value);
  const intDigits = countIntegerDigits(value);

  if (intDigits > 0) {
    // Number >= 1: decimals needed = target sig figs - integer digits
    return Math.max(0, targetSigFigs - intDigits);
  } else {
    // Number < 1: need to account for leading zeros
    // e.g., 0.02 has e=-2, so we need |e| + targetSigFigs - currentSigFigs more decimals
    const currentDecimals = Math.abs(value.e) + currentSigFigs - 1;
    const neededMore = targetSigFigs - currentSigFigs;
    return currentDecimals + neededMore;
  }
}

/**
 * Add thousand separators to a formatted number string
 */
function addThousandsSeparator(str: string): string {
  const parts = str.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
