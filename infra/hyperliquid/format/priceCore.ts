/**
 * Core price utilities for Hyperliquid
 *
 * Uses Big.js for precise decimal arithmetic.
 *
 * Hyperliquid Price Rules:
 * 1. Maximum 5 significant figures for non-integer prices
 * 2. Maximum (6 - szDecimals) decimal places
 * 3. Integer prices are ALWAYS allowed, regardless of significant figures
 */

import Big from 'big.js';

// Configure Big.js: ROUND_HALF_UP (standard rounding where 0.5 rounds up)
Big.RM = Big.roundHalfUp;

/** Maximum decimal places for Perp markets (Spot uses 8) */
export const MAX_DECIMALS_PERP = 6;

/** Maximum significant figures for non-integer prices */
export const MAX_SIG_FIGS = 5;

/**
 * Calculate allowed decimal places: 6 - szDecimals
 */
export function getAllowedDecimals(szDecimals: number): number {
  return Math.max(0, MAX_DECIMALS_PERP - szDecimals);
}

/**
 * Count significant figures using Big.js
 *
 * Big.js stores coefficients in the `c` array, which naturally
 * represents significant figures (trailing zeros are removed).
 *
 * @example
 * countSigFigs(new Big('123.45'))   // 5
 * countSigFigs(new Big('0.020905')) // 5
 * countSigFigs(new Big('1000'))     // 1
 */
export function countSigFigs(value: Big): number {
  if (value.eq(0)) return 0;
  return value.c.length;
}

/**
 * Count integer digits in a number
 *
 * @example
 * countIntegerDigits(new Big('12345.67')) // 5
 * countIntegerDigits(new Big('0.123'))    // 0
 * countIntegerDigits(new Big('1000'))     // 4
 */
export function countIntegerDigits(value: Big): number {
  if (value.abs().lt(1)) return 0;
  // e is the exponent: 123.45 has e=2, meaning 1.2345 * 10^2
  // Integer digits = e + 1
  return value.e + 1;
}

/**
 * Round to specified significant figures using Big.js prec()
 */
export function roundToSigFigs(value: Big, sigFigs: number): Big {
  if (value.eq(0)) return new Big(0);
  return value.prec(sigFigs);
}

/**
 * Core function: Apply Hyperliquid price rules
 *
 * Processing order:
 * 1. Round to allowed decimal places (the precision we can express)
 * 2. If integer part >= 5 digits, round to integer (always allowed)
 * 3. If still > 5 sig figs, round to 5 sig figs
 *
 * @param price - Price to process (number or string)
 * @param szDecimals - Asset's szDecimals from Hyperliquid
 * @returns Rounded price as Big, or Big(0) for invalid input
 *
 * @example
 * roundPrice(106307.5, 5)  // Big("106308")
 * roundPrice(0.020905, 0)  // Big("0.020905")
 * roundPrice(123.445, 4)   // Big("123.45")
 */
export function roundPrice(price: number | string, szDecimals: number): Big {
  // Handle invalid input
  if (typeof price === 'number' && (!isFinite(price) || price <= 0)) {
    return new Big(0);
  }

  let value: Big;
  try {
    value = new Big(price);
  } catch {
    return new Big(0);
  }

  if (value.lte(0)) {
    return new Big(0);
  }

  const allowedDecimals = getAllowedDecimals(szDecimals);

  // Step 1: Round to allowed decimal places
  let result = value.round(allowedDecimals);

  // Step 2: If integer part >= 5 digits, round to integer (always allowed)
  const intDigits = countIntegerDigits(result);
  if (intDigits >= MAX_SIG_FIGS) {
    return result.round(0);
  }

  // Step 3: If > 5 sig figs, round to 5 sig figs, then re-apply decimal constraint
  const sigFigs = countSigFigs(result);
  if (sigFigs > MAX_SIG_FIGS) {
    result = roundToSigFigs(result, MAX_SIG_FIGS);
    result = result.round(allowedDecimals);
  }

  return result;
}

/**
 * Validate if a price conforms to Hyperliquid rules
 *
 * A price is valid if it equals its rounded version.
 */
export function isValidPrice(price: number | string, szDecimals: number): boolean {
  try {
    const value = new Big(price);
    if (value.lte(0)) return false;

    const rounded = roundPrice(price, szDecimals);
    return value.eq(rounded);
  } catch {
    return false;
  }
}
