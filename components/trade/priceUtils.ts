/**
 * Price rounding utilities for Hyperliquid orders
 *
 * Rules:
 * - Prices can have up to 5 significant figures
 * - No more than MAX_DECIMALS - szDecimals decimal places
 *   - MAX_DECIMALS = 6 for perps, 8 for spot
 * - Integer prices are always allowed, regardless of significant figures
 *   - E.g., 123456 is valid even though 12345.6 is not
 */

const MAX_DECIMALS_PERP = 6;
const MAX_DECIMALS_SPOT = 8;
const MAX_SIGNIFICANT_FIGURES = 5;

/**
 * Count the number of significant figures in a number
 */
function countSignificantFigures(num: number): number {
  if (num === 0) return 0;

  // Convert to string and remove sign
  const str = Math.abs(num).toString();

  // Remove decimal point and leading zeros
  const cleaned = str.replace('.', '').replace(/^0+/, '');

  return cleaned.length;
}

/**
 * Round a number to a maximum number of significant figures
 */
function roundToSignificantFigures(num: number, sigFigs: number): number {
  if (num === 0) return 0;

  const magnitude = Math.floor(Math.log10(Math.abs(num)));
  const scale = Math.pow(10, magnitude - sigFigs + 1);

  return Math.round(num / scale) * scale;
}

/**
 * Round price according to Hyperliquid rules
 *
 * @param price - The price to round
 * @param szDecimals - The szDecimals for the asset
 * @param isSpot - Whether this is a spot trade (default: false for perps)
 * @returns The rounded price as a string
 */
export function roundPrice(price: number, szDecimals: number, isSpot = false): string {
  if (isNaN(price) || price === 0) return '0';

  const maxDecimals = isSpot ? MAX_DECIMALS_SPOT : MAX_DECIMALS_PERP;
  const allowedDecimals = maxDecimals - szDecimals;

  // Check if the price is an integer
  const isInteger = Number.isInteger(price);

  if (isInteger) {
    // Integer prices are always allowed, regardless of significant figures
    return price.toString();
  }

  // For non-integer prices, apply both constraints:
  // 1. Maximum significant figures
  // 2. Maximum decimal places

  // First, limit to max significant figures
  let roundedPrice = price;
  const sigFigs = countSignificantFigures(price);
  if (sigFigs > MAX_SIGNIFICANT_FIGURES) {
    roundedPrice = roundToSignificantFigures(price, MAX_SIGNIFICANT_FIGURES);
  }

  // Then, limit to max decimal places
  const decimalPlaces = Math.min(allowedDecimals, MAX_SIGNIFICANT_FIGURES);
  roundedPrice = parseFloat(roundedPrice.toFixed(decimalPlaces));

  return roundedPrice.toString();
}

/**
 * Validate if a price string is valid according to Hyperliquid rules
 *
 * @param priceStr - The price string to validate
 * @param szDecimals - The szDecimals for the asset
 * @param isSpot - Whether this is a spot trade (default: false for perps)
 * @returns true if the price is valid
 */
export function isValidPrice(priceStr: string, szDecimals: number, isSpot = false): boolean {
  const price = parseFloat(priceStr);
  if (isNaN(price) || price <= 0) return false;

  const maxDecimals = isSpot ? MAX_DECIMALS_SPOT : MAX_DECIMALS_PERP;
  const allowedDecimals = maxDecimals - szDecimals;

  // Check if it's an integer
  if (Number.isInteger(price)) {
    return true; // Integers are always valid
  }

  // Check significant figures
  const sigFigs = countSignificantFigures(price);
  if (sigFigs > MAX_SIGNIFICANT_FIGURES) {
    return false;
  }

  // Check decimal places
  const parts = priceStr.split('.');
  if (parts.length === 2 && parts[1].length > allowedDecimals) {
    return false;
  }

  return true;
}
