/**
 * Format size for display
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
