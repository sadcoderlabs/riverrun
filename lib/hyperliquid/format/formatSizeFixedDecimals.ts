/**
 * Format size for display with fixed decimal places
 *
 * This function is specifically for order book display when showing sizes
 * in asset units (e.g., BTC, ETH). Unlike formatSize which removes trailing
 * zeros, this function always shows exactly szDecimals decimal places for
 * consistent alignment and readability in the order book.
 *
 * Examples with BTC (szDecimals=5):
 * - "12.014" → "12.01400"
 * - "12.01440" → "12.01440"
 * - "12" → "12.00000"
 * - "0.1" → "0.10000"
 *
 * @param size - Size from API (string or number)
 * @param szDecimals - Asset's szDecimals (determines fixed decimal places)
 * @param thousandsSeparator - Whether to add thousand separators
 * @returns Formatted size string with fixed decimal places
 */
export function formatSizeFixedDecimals(
  size: string | number,
  szDecimals: number,
  thousandsSeparator: boolean,
): string {
  // Parse size to number
  const sizeNum = typeof size === 'string' ? parseFloat(size) : size;

  // Handle invalid sizes
  if (!isFinite(sizeNum) || sizeNum < 0) {
    return '0';
  }

  // Handle zero - still show fixed decimals
  if (sizeNum === 0) {
    return szDecimals > 0 ? `0.${'0'.repeat(szDecimals)}` : '0';
  }

  // Format with fixed decimal places (always szDecimals)
  let formatted = sizeNum.toFixed(szDecimals);

  // Add thousand separators if requested
  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  return formatted;
}
