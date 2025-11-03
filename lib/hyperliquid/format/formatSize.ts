/**
 * Format size for display
 *
 * Sizes are rounded to szDecimals of the asset.
 * We also remove trailing zeros for cleaner display.
 *
 * @param size - Size from API (string or number)
 * @param szDecimals - Asset's szDecimals
 * @param thousandsSeparator - Whether to add thousand separators (required)
 * @returns Formatted size string without trailing zeros
 */
export function formatSize(
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

  // Handle zero
  if (sizeNum === 0) {
    return '0';
  }

  // Format with szDecimals
  let formatted = sizeNum.toFixed(szDecimals);

  // Remove trailing zeros from decimal part only (not from integer part)
  // This fixes the bug where "1000" -> "1"
  if (formatted.includes('.')) {
    // Has decimal point: remove trailing zeros and decimal point if all zeros
    formatted = formatted.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }

  // Add thousand separators if requested
  if (thousandsSeparator) {
    const parts = formatted.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    formatted = parts.join('.');
  }

  return formatted || '0';
}
