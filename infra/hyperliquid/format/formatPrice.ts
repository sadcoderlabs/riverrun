/**
 * Price formatting utilities for Hyperliquid order book display
 *
 * Uses the shared Hyperliquid price rules from priceCore.
 *
 * Formatting rules for UI display:
 * - If total significant figures < 5: pad with zeros to reach 5
 * - If >= 5 sig figs: remove trailing zeros
 * - Never exceed maxDecimalPlaces = (6 - szDecimals)
 */

import {
  countIntegerDigits,
  countSignificantFigures,
  getAllowedDecimals,
  MAX_SIGNIFICANT_FIGURES,
} from './priceCore';

/**
 * Format price for display according to Hyperliquid rules
 *
 * This function handles UI display formatting with:
 * - Padding to 5 significant figures for consistency
 * - Optional thousand separators
 * - Intelligent trailing zero handling
 *
 * @param price - Price from API (string or number)
 * @param szDecimals - Asset's szDecimals (from Hyperliquid meta)
 * @param thousandsSeparator - Whether to add thousand separators
 * @returns Formatted price string for UI display
 *
 * @example
 * formatPrice(4219, 4, false)      // "4219.0" (pad to 5 sig figs)
 * formatPrice(0.20359, 0, false)   // "0.20359" (already 5 sig figs)
 * formatPrice(114971, 5, true)     // "114,971" (with separator)
 */
export function formatPrice(
  price: string | number,
  szDecimals: number,
  thousandsSeparator: boolean,
): string {
  // Parse price to number
  const priceNum = typeof price === 'string' ? parseFloat(price) : price;

  // Handle invalid prices
  if (!isFinite(priceNum) || priceNum < 0) {
    return '0';
  }

  // Handle zero
  if (priceNum === 0) {
    return '0';
  }

  const allowedDecimals = getAllowedDecimals(szDecimals);
  const integerDigits = countIntegerDigits(priceNum);
  const currentSigFigs = countSignificantFigures(priceNum);

  // Rule: Integer prices are always allowed
  // If price >= 1 AND integer part already has >= 5 digits, round to integer
  if (priceNum >= 1 && integerDigits >= MAX_SIGNIFICANT_FIGURES) {
    const rounded = Math.round(priceNum);
    let formatted = rounded.toString();

    if (thousandsSeparator) {
      formatted = addThousandsSeparator(formatted);
    }

    return formatted;
  }

  // Calculate how many decimal places we can use
  let allowedDecimalPlaces: number;

  if (priceNum >= 1) {
    // Integer part has < 5 digits, limited by remaining sig figs
    const remainingSigFigs = MAX_SIGNIFICANT_FIGURES - integerDigits;
    allowedDecimalPlaces = Math.min(remainingSigFigs, allowedDecimals);
  } else {
    // Number < 1, use full allowedDecimals
    allowedDecimalPlaces = allowedDecimals;
  }

  // Determine target decimal places for display
  let targetDecimalPlaces: number;

  if (currentSigFigs < MAX_SIGNIFICANT_FIGURES) {
    // Need to pad to reach 5 sig figs
    const needToAdd = MAX_SIGNIFICANT_FIGURES - currentSigFigs;

    // Get current decimal places
    const str = priceNum.toString();
    const decimalIndex = str.indexOf('.');
    const currentDecimalPlaces = decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;

    // Target = current + needed (but capped by allowed)
    targetDecimalPlaces = Math.min(currentDecimalPlaces + needToAdd, allowedDecimalPlaces);
  } else {
    // Already have >= 5 sig figs
    targetDecimalPlaces = allowedDecimalPlaces;
  }

  // Format with target decimal places
  let formatted = priceNum.toFixed(targetDecimalPlaces);

  // If input has >= 5 sig figs, try to remove trailing zeros for cleaner display
  // But ensure the result still has >= 5 sig figs
  if (currentSigFigs >= MAX_SIGNIFICANT_FIGURES) {
    const withoutTrailingZeros = formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
    const resultNum = parseFloat(withoutTrailingZeros);
    const resultSigFigs = countSignificantFigures(resultNum);

    if (resultSigFigs >= MAX_SIGNIFICANT_FIGURES) {
      formatted = withoutTrailingZeros;
    }
  }

  // Add thousand separators if requested
  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = addThousandsSeparator(parts[0]);
    formatted = parts.join('.');
  }

  return formatted || '0';
}

/**
 * Add thousand separators to an integer string
 */
function addThousandsSeparator(integerStr: string): string {
  return integerStr.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
