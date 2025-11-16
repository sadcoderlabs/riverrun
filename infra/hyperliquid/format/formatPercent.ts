/**
 * Format percentage values for display
 *
 * Used for displaying percentage values with configurable decimal places.
 * Always includes thousand separators for readability.
 * Keeps trailing zeros for consistency (e.g., "10.50%" not "10.5%").
 * Supports negative values (e.g., for negative ROE or price changes).
 *
 * Common use cases:
 * - 0 decimals: Round percentage display (e.g., "15%")
 * - 1 decimal: Position ROE % (e.g., "12.5%")
 * - 2 decimals: 24h price change (e.g., "3.45%")
 * - 3 decimals: Moderate precision scenarios (e.g., "1.234%")
 * - 4 decimals: 8-hour funding rate (e.g., "0.0123%")
 *
 * @param value - Percentage value from API (string or number), can be in decimal form (0.05) or percentage form (5)
 * @param decimals - Number of decimal places: 0, 1, 2, 3, or 4, required
 * @param isDecimalForm - If true, treats input as decimal (0.05 = 5%), if false treats as percentage (5 = 5%). Default: false
 * @returns Formatted percentage string with thousand separators and % symbol
 *
 * @example
 * formatPercent(5, 1, false)           // "5.0%"
 * formatPercent(0.05, 1, true)         // "5.0%"
 * formatPercent(12.5, 1, false)        // "12.5%"
 * formatPercent(3.456, 2, false)       // "3.46%"
 * formatPercent(0.0123, 4, true)       // "1.2300%"
 * formatPercent(-5.5, 1, false)        // "-5.5%"
 * formatPercent(1234.56, 2, false)     // "1,234.56%"
 */
export function formatPercent(
  value: string | number,
  decimals: 0 | 1 | 2 | 3 | 4,
  isDecimalForm = false,
): string {
  // Parse value to number
  let valueNum = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid values
  if (!isFinite(valueNum)) {
    return decimals === 0 ? '0%' : `0.${'0'.repeat(decimals)}%`;
  }

  // Convert from decimal form to percentage if needed
  if (isDecimalForm) {
    valueNum = valueNum * 100;
  }

  // Format with specified decimal places
  let formatted = valueNum.toFixed(decimals);

  // Add thousand separators
  // Split into parts to handle negative numbers and decimals correctly
  const parts = formatted.split('.');
  const integerPart = parts[0];
  const decimalPart = parts[1];

  // Handle negative numbers: extract sign, format absolute value, then re-add sign
  const isNegative = integerPart.startsWith('-');
  const absoluteInteger = isNegative ? integerPart.slice(1) : integerPart;

  // Add thousand separators to integer part
  const formattedInteger = absoluteInteger.replace(/\B(?=(\d{3})+(?!\d))/g, ',');

  // Reconstruct the number
  const sign = isNegative ? '-' : '';
  formatted = decimalPart
    ? `${sign}${formattedInteger}.${decimalPart}`
    : `${sign}${formattedInteger}`;

  return `${formatted}%`;
}
