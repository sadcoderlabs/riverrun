/**
 * Price formatting utilities for Hyperliquid order book display
 *
 * Formats prices according to the following rule:
 * "If total significant figures (integer + decimal) is less than 5,
 *  pad with decimals to reach 5 significant figures"
 *
 * Key principle: Maintain 5 significant figures for readability
 * - If < 5 sig figs: pad with zeros to reach 5
 * - If >= 5 sig figs: remove trailing zeros
 * - Never exceed maxDecimalPlaces = (MAX_DECIMALS - szDecimals)
 */

/**
 * Maximum decimal places for Perp markets
 * Spot markets use 8 instead
 */
const DEFAULT_MAX_DECIMALS_PERP = 6;

/**
 * Count significant figures in a number
 *
 * Significant figures are all digits except:
 * - Leading zeros (zeros before the first non-zero digit)
 * - Trailing zeros in decimal part only (for integers, trailing zeros count)
 *
 * Examples:
 * - 4219 → 4 sig figs (4,2,1,9)
 * - 4220 → 4 sig figs (4,2,2,0) - trailing zero counts for integers
 * - 4219.5 → 5 sig figs (4,2,1,9,5)
 * - 4219.50 → 5 sig figs (4,2,1,9,5) - trailing zero in decimal doesn't count
 * - 0.2 → 1 sig fig (2)
 * - 0.004705 → 4 sig figs (4,7,0,5) - middle zero counts
 * - 114971 → 6 sig figs
 *
 * @param num - Number to count significant figures for
 * @returns Number of significant figures
 */
function countSignificantFigures(num: number): number {
  if (num === 0) return 0;

  // Convert to string and remove sign
  let str = Math.abs(num).toString();

  // Handle scientific notation (e.g., "1e-5")
  if (str.includes('e')) {
    const [mantissa] = str.split('e');
    str = mantissa;
  }

  // Check if it has a decimal point
  const hasDecimal = str.includes('.');

  // Remove decimal point for processing
  str = str.replace('.', '');

  // Remove leading zeros
  str = str.replace(/^0+/, '');

  // For numbers with decimal part or fractional numbers, remove trailing zeros
  // For integers (no decimal point and >= 1), keep trailing zeros as they're significant
  if (hasDecimal || num < 1) {
    str = str.replace(/0+$/, '');
  }

  // Count remaining digits
  return str.length;
}

/**
 * Format price for display according to the 5-sig-fig padding rule
 *
 * Rule: If significant figures < 5, pad decimals to reach 5 sig figs
 * (constrained by maxDecimalPlaces)
 *
 * Examples:
 * - ETH (sz=4, max=2):
 *   - "4219" → 4 sig figs → pad 1 decimal → "4219.0"
 *   - "123" → 3 sig figs → pad 2 decimals → "123.00"
 *   - "4219.5" → 5 sig figs → no padding → "4219.5"
 *   - "4219.50" → 5 sig figs → remove trailing zero → "4219.5"
 *
 * - BTC (sz=5, max=1):
 *   - "114971" → 6 sig figs → no padding → "114971"
 *   - "1149" → 4 sig figs → pad 1 decimal → "1149.0"
 *
 * - DOGE (sz=0, max=6):
 *   - "0.2" → 1 sig fig → pad 4 decimals → "0.20000"
 *   - "0.20359" → 5 sig figs → no padding → "0.20359"
 *
 * @param price - Price from API (string or number)
 * @param szDecimals - Asset's szDecimals (from Hyperliquid meta)
 * @param maxDecimals - MAX_DECIMALS (6 for Perp, 8 for Spot)
 * @returns Formatted price string with appropriate precision
 */
export function formatPrice(
  price: string | number,
  szDecimals: number,
  maxDecimals = DEFAULT_MAX_DECIMALS_PERP,
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

  // Calculate maximum allowed decimal places
  const maxDecimalPlaces = Math.max(0, maxDecimals - szDecimals);

  // Count current significant figures
  const currentSigFigs = countSignificantFigures(priceNum);

  // Determine how many decimal places to show
  let targetDecimalPlaces: number;

  if (currentSigFigs < 5) {
    // Need to pad to reach 5 sig figs
    const needToAdd = 5 - currentSigFigs;

    // Get current decimal places
    const str = priceNum.toString();
    const decimalIndex = str.indexOf('.');
    const currentDecimalPlaces = decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;

    // Target decimal places = current + needed (but capped by max)
    targetDecimalPlaces = Math.min(currentDecimalPlaces + needToAdd, maxDecimalPlaces);
  } else {
    // Already have >= 5 sig figs, use max decimal places then remove trailing zeros
    targetDecimalPlaces = maxDecimalPlaces;
  }

  // Format with target decimal places
  let formatted = priceNum.toFixed(targetDecimalPlaces);

  // If we already have >= 5 sig figs, remove trailing zeros
  if (currentSigFigs >= 5) {
    // Remove trailing zeros but keep at least minimal meaningful decimals
    formatted = formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  return formatted || '0';
}

/**
 * Format size for display (similar logic to price)
 *
 * Sizes are rounded to szDecimals of the asset.
 * We also remove trailing zeros for cleaner display.
 *
 * @param size - Size from API (string or number)
 * @param szDecimals - Asset's szDecimals
 * @returns Formatted size string without trailing zeros
 */
export function formatSize(size: string | number, szDecimals: number): string {
  // Parse size to number
  const sizeNum = typeof size === 'string' ? parseFloat(size) : size;

  // Handle invalid sizes
  if (!isFinite(sizeNum) || sizeNum < 0) {
    return '0';
  }

  // Handle zero
  if (sizeNum === 0) {
    return '0';
  }

  // Format with szDecimals
  let formatted = sizeNum.toFixed(szDecimals);

  // Remove trailing zeros
  formatted = formatted.replace(/\.?0+$/, '');

  return formatted || '0';
}
