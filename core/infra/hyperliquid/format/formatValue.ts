/**
 * Format USDC values for display
 *
 * Used for displaying USDC values like margin, order value, trade volume, and available to trade.
 * Always includes thousand separators for readability.
 * Supports both 2 decimal places or integer display (0 decimals).
 *
 * Key differences from formatSize:
 * - Always includes thousand separators (no option to disable)
 * - Keeps trailing zeros for financial clarity (e.g., "100.50" not "100.5")
 * - Supports negative values (for PnL and funding)
 *
 * @param value - USDC value from API (string or number)
 * @param decimals - Number of decimal places: 2 or 0 (integer), required
 * @returns Formatted value string with thousand separators
 *
 * @example
 * formatValue('1234.56', 2)      // "1,234.56"
 * formatValue('1234567.89', 2)   // "1,234,567.89"
 * formatValue('1234.56', 0)      // "1,235"
 * formatValue('0.5', 2)          // "0.50"
 * formatValue(1000000, 2)        // "1,000,000.00"
 * formatValue('-123.45', 2)      // "-123.45" (for PnL)
 */
export function formatValue(value: string | number, decimals: 0 | 2): string {
  // Parse value to number
  const valueNum = typeof value === 'string' ? parseFloat(value) : value;

  // Handle invalid values
  if (!isFinite(valueNum)) {
    return decimals === 2 ? '0.00' : '0';
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

  return formatted;
}
