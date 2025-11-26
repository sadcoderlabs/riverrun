/**
 * Core price utilities for Hyperliquid
 *
 * This module contains the shared logic for handling Hyperliquid's price rules.
 * Both roundPrice (for order submission) and formatPrice (for UI display) use these utilities.
 *
 * Hyperliquid Rules:
 * 1. Prices can have up to 5 significant figures
 * 2. Decimal places cannot exceed MAX_DECIMALS - szDecimals (MAX_DECIMALS = 6 for perps)
 * 3. Integer prices are ALWAYS allowed, regardless of significant figures
 *    (e.g., 123456 is valid even though 12345.6 is not)
 */

/** Maximum decimal places for Perp markets */
export const MAX_DECIMALS_PERP = 6;

/** Maximum significant figures allowed for non-integer prices */
export const MAX_SIGNIFICANT_FIGURES = 5;

/**
 * Count significant figures in a number
 *
 * Counting rules:
 * - Leading zeros are NOT significant
 * - All non-zero digits are significant
 * - Zeros between non-zero digits are significant
 * - Trailing zeros in the decimal part are NOT significant (when parsed as number)
 *
 * @example
 * countSignificantFigures(4219)     // 4 (integer digits)
 * countSignificantFigures(4219.5)   // 5 (4 integer + 1 decimal)
 * countSignificantFigures(0.01516)  // 4 (1,5,1,6 - leading zeros don't count)
 * countSignificantFigures(0.020905) // 5 (2,0,9,0,5)
 * countSignificantFigures(114971)   // 6 (6 integer digits)
 */
export function countSignificantFigures(num: number): number {
  if (num === 0) return 0;

  // Convert to string and remove sign
  let str = Math.abs(num).toString();

  // Handle scientific notation (e.g., "1e-5")
  if (str.includes('e')) {
    const absNum = Math.abs(num);
    str = absNum.toFixed(20).replace(/\.?0+$/, '');
  }

  // Split into integer and decimal parts
  const parts = str.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts[1] || '';

  // Remove trailing zeros from decimal part
  const decimalWithoutTrailing = decimalPart.replace(/0+$/, '');

  // Count digits
  if (num < 1) {
    // Pure decimal: remove leading zeros and count remaining digits
    const withoutLeadingZeros = decimalWithoutTrailing.replace(/^0+/, '');
    return withoutLeadingZeros.length;
  } else {
    // Number >= 1: count integer digits + decimal places
    return integerPart.length + decimalWithoutTrailing.length;
  }
}

/**
 * Count integer digits in a number
 */
export function countIntegerDigits(num: number): number {
  if (num === 0) return 1;
  return Math.floor(Math.abs(num)).toString().length;
}

/**
 * Round a number to a specific number of significant figures
 */
export function roundToSignificantFigures(num: number, sigFigs: number): number {
  if (num === 0) return 0;

  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const scale = Math.pow(10, magnitude - sigFigs + 1);

  return Math.round(num / scale) * scale;
}

/**
 * Calculate allowed decimal places based on szDecimals
 */
export function getAllowedDecimals(szDecimals: number): number {
  return Math.max(0, MAX_DECIMALS_PERP - szDecimals);
}

/**
 * Result of applying Hyperliquid price rules
 */
export interface PriceRuleResult {
  /** The rounded price value */
  value: number;
  /** Whether the price is an integer */
  isInteger: boolean;
  /** Number of allowed decimal places */
  allowedDecimals: number;
  /** Number of significant figures in the result */
  sigFigs: number;
}

/**
 * Apply Hyperliquid price rules to a number
 *
 * This is the core function that handles:
 * 1. Integer prices (always allowed regardless of sig figs)
 * 2. Rounding to max 5 significant figures
 * 3. Rounding to max allowedDecimals decimal places
 *
 * @param price - The price to process
 * @param szDecimals - The szDecimals for the asset
 * @returns The processed price with metadata, or undefined for invalid input
 */
export function applyHyperliquidPriceRules(
  price: number,
  szDecimals: number,
): PriceRuleResult | undefined {
  // Handle invalid prices
  if (!isFinite(price) || price <= 0) {
    return undefined;
  }

  const allowedDecimals = getAllowedDecimals(szDecimals);

  // Integer prices are always allowed, regardless of significant figures
  if (Number.isInteger(price)) {
    return {
      value: price,
      isInteger: true,
      allowedDecimals,
      sigFigs: countSignificantFigures(price),
    };
  }

  // For non-integer prices, apply both constraints
  let roundedPrice = price;
  const sigFigs = countSignificantFigures(price);

  // 1. Round to max significant figures if needed
  if (sigFigs > MAX_SIGNIFICANT_FIGURES) {
    roundedPrice = roundToSignificantFigures(price, MAX_SIGNIFICANT_FIGURES);
  }

  // 2. Round to max decimal places
  roundedPrice = parseFloat(roundedPrice.toFixed(allowedDecimals));

  // Check if result became an integer after rounding
  const resultIsInteger = Number.isInteger(roundedPrice);

  return {
    value: roundedPrice,
    isInteger: resultIsInteger,
    allowedDecimals,
    sigFigs: countSignificantFigures(roundedPrice),
  };
}

/**
 * Validate if a price conforms to Hyperliquid rules
 *
 * @param price - The price to validate (as number)
 * @param szDecimals - The szDecimals for the asset
 * @returns true if the price is valid
 */
export function isValidHyperliquidPrice(price: number, szDecimals: number): boolean {
  if (!isFinite(price) || price <= 0) {
    return false;
  }

  // Integer prices are always valid
  if (Number.isInteger(price)) {
    return true;
  }

  // Check significant figures
  const sigFigs = countSignificantFigures(price);
  if (sigFigs > MAX_SIGNIFICANT_FIGURES) {
    return false;
  }

  // Check decimal places
  const allowedDecimals = getAllowedDecimals(szDecimals);
  const priceStr = price.toString();
  const parts = priceStr.split('.');
  if (parts.length === 2 && parts[1].length > allowedDecimals) {
    return false;
  }

  return true;
}
