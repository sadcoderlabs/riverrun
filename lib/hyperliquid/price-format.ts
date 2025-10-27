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
 * Counting rule for price display context:
 * - For pure decimals (< 1): count all decimal places (including leading zeros after decimal point)
 * - For numbers >= 1: count integer digits + decimal places
 * - Trailing zeros in decimal part don't count
 *
 * Examples:
 * - 4219 → 4 sig figs (4 integer digits)
 * - 4220 → 4 sig figs (4 integer digits)
 * - 4219.5 → 5 sig figs (4 integer + 1 decimal)
 * - 4219.50 → 5 sig figs (4 integer + 1 decimal, trailing zero removed)
 * - 0.2 → 1 sig fig (1 decimal place)
 * - 0.03 → 2 sig figs (2 decimal places)
 * - 0.004705 → 6 sig figs (6 decimal places including leading zeros)
 * - 0.028542 → 6 sig figs (6 decimal places)
 * - 114971 → 6 sig figs (6 integer digits)
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
    // Convert scientific notation to regular decimal string
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
    // Pure decimal: count all decimal places (including leading zeros)
    return decimalWithoutTrailing.length;
  } else {
    // Number >= 1: count integer digits + decimal places
    const integerDigits = integerPart.length;
    const decimalDigits = decimalWithoutTrailing.length;
    return integerDigits + decimalDigits;
  }
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

  // Add thousand separators to integer part
  const parts = formatted.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  formatted = parts.join('.');

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
