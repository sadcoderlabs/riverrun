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
 * - Never exceed maxDecimalPlaces = (MAX_DECIMALS_PERP - szDecimals)
 */

/**
 * Maximum decimal places for Perp markets
 * Spot markets use 8 instead (see formatSpotPrice)
 */
const MAX_DECIMALS_PERP = 6;

/**
 * Count significant figures in a number
 *
 * Counting rule according to standard significant figures definition:
 * - Leading zeros are NOT significant
 * - All non-zero digits are significant
 * - Zeros between non-zero digits are significant
 * - Trailing zeros in the decimal part are NOT significant (when parsed as number)
 *
 * Examples:
 * - 4219 → 4 sig figs (4 integer digits)
 * - 4220 → 4 sig figs (4 integer digits, trailing zero in integer is significant)
 * - 4219.5 → 5 sig figs (4 integer + 1 decimal)
 * - 4219.50 → 5 sig figs (4 integer + 1 decimal, trailing zero removed when parsed)
 * - 0.2 → 1 sig fig (only the 2)
 * - 0.03 → 1 sig fig (only the 3, leading zeros don't count)
 * - 0.01516 → 4 sig figs (1,5,1,6 - leading zeros don't count)
 * - 0.004705 → 4 sig figs (4,7,0,5 - leading zeros don't count)
 * - 0.028542 → 5 sig figs (2,8,5,4,2 - leading zeros don't count)
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
    // Pure decimal: remove leading zeros and count remaining digits
    // e.g., "0.01516" -> "01516" -> remove leading zeros -> "1516" -> 4 sig figs
    const withoutLeadingZeros = decimalWithoutTrailing.replace(/^0+/, '');
    return withoutLeadingZeros.length;
  } else {
    // Number >= 1: count integer digits + decimal places
    const integerDigits = integerPart.length;
    const decimalDigits = decimalWithoutTrailing.length;
    return integerDigits + decimalDigits;
  }
}

/**
 * Count integer digits in a number
 *
 * @param num - Number to count integer digits for
 * @returns Number of integer digits
 */
function countIntegerDigits(num: number): number {
  if (num === 0) return 1;
  return Math.floor(Math.abs(num)).toString().length;
}

/**
 * Format price for display according to Hyperliquid rules
 *
 * This function is for Perp markets (MAX_DECIMALS_PERP = 6).
 * For Spot markets, use formatSpotPrice instead.
 *
 * Hyperliquid Rules:
 * 1. Prices can have up to 5 significant figures
 * 2. Decimal places cannot exceed MAX_DECIMALS_PERP - szDecimals
 * 3. Integer prices are ALWAYS allowed, regardless of significant figures
 *    (e.g., 123456 is valid even though 12345.6 is not)
 *
 * Implementation:
 * - If integer part has >= 5 digits: round to integer (no decimals allowed)
 * - If integer part has < 5 digits: allow decimals up to 5 total sig figs
 * - If total sig figs < 5: pad with decimals to reach 5 sig figs
 *
 * Examples for Perp markets:
 * - BTC (sz=5, maxDecimalPlaces=1):
 *   - "106307" → integer with 6 digits → "106307" (allowed)
 *   - "106307.5" → would be 6 sig figs → "106308" (round to integer)
 *   - "1234.5" → 5 sig figs, integer part < 5 digits → "1234.5" (allowed)
 *   - "1149" → 4 sig figs → pad 1 decimal → "1149.0"
 *
 * - ETH (sz=4, maxDecimalPlaces=2):
 *   - "12345" → integer with 5 digits → "12345" (allowed)
 *   - "12345.67" → would be 7 sig figs → "12346" (round to integer)
 *   - "1234.56" → 6 sig figs, integer part < 5 digits → "1234.6" (1 decimal)
 *   - "123.45" → 5 sig figs → "123.45" (allowed)
 *
 * @param price - Price from API (string or number)
 * @param szDecimals - Asset's szDecimals (from Hyperliquid meta)
 * @param thousandsSeparator - Whether to add thousand separators (required)
 * @returns Formatted price string with appropriate precision for Perp markets
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

  // Calculate maximum allowed decimal places for Perp markets
  const maxDecimalPlaces = Math.max(0, MAX_DECIMALS_PERP - szDecimals);

  // Count integer digits and current significant figures
  const integerDigits = countIntegerDigits(priceNum);
  const currentSigFigs = countSignificantFigures(priceNum);

  // Rule: Integer prices are always allowed
  // If price >= 1 AND integer part already has >= 5 digits, we must round to integer
  if (priceNum >= 1 && integerDigits >= 5) {
    const rounded = Math.round(priceNum);
    let formatted = rounded.toString();

    // Add thousand separators if requested
    if (thousandsSeparator) {
      formatted = formatted.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }

    return formatted;
  }

  // For numbers < 1 OR integer part has < 5 digits, we can allow decimals
  // Calculate how many decimal places we can use
  let allowedDecimalPlaces: number;

  if (priceNum >= 1) {
    // Integer part has < 5 digits, limited by remaining sig figs
    const remainingSigFigs = 5 - integerDigits;
    allowedDecimalPlaces = Math.min(remainingSigFigs, maxDecimalPlaces);
  } else {
    // Number < 1, use full maxDecimalPlaces (for DOGE, etc.)
    allowedDecimalPlaces = maxDecimalPlaces;
  }

  // Determine target decimal places
  let targetDecimalPlaces: number;

  if (currentSigFigs < 5) {
    // Need to pad to reach 5 sig figs
    const needToAdd = 5 - currentSigFigs;

    // Get current decimal places
    const str = priceNum.toString();
    const decimalIndex = str.indexOf('.');
    const currentDecimalPlaces = decimalIndex === -1 ? 0 : str.length - decimalIndex - 1;

    // Target decimal places = current + needed (but capped by allowed)
    targetDecimalPlaces = Math.min(currentDecimalPlaces + needToAdd, allowedDecimalPlaces);
  } else {
    // Already have >= 5 sig figs, use allowed decimal places then remove trailing zeros
    targetDecimalPlaces = allowedDecimalPlaces;
  }

  // Format with target decimal places
  let formatted = priceNum.toFixed(targetDecimalPlaces);

  // Strategy: Always work with numbers to count sig figs, then ensure string output has enough digits
  //
  // If input has >= 5 sig figs, try to remove trailing zeros for cleaner display
  // But ensure the resulting NUMBER (when parsed) still has >= 5 sig figs
  //
  // Example 1: "40.230" -> parseFloat -> 40.23 (4 sig figs) -> keep "40.230" (to show 5 sig figs)
  // Example 2: "40.322" -> parseFloat -> 40.322 (5 sig figs) -> use "40.322" (already 5 sig figs)
  // Example 3: "0.203590" -> parseFloat -> 0.20359 (5 sig figs) -> use "0.20359" (already 5 sig figs)
  if (currentSigFigs >= 5) {
    // Try removing trailing zeros
    const withoutTrailingZeros = formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

    // Convert back to number and count sig figs of the NUMBER
    const resultNum = parseFloat(withoutTrailingZeros);
    const resultSigFigs = countSignificantFigures(resultNum);

    // Only use the trimmed version if the NUMBER still has >= 5 sig figs
    if (resultSigFigs >= 5) {
      formatted = withoutTrailingZeros;
    }
    // Otherwise keep the trailing zeros to ensure output displays 5 sig figs
  }

  // Add thousand separators if requested
  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  return formatted || '0';
}
