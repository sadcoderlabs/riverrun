/**
 * Format margin mode type for display
 *
 * Converts lowercase margin mode type from API/hooks to capitalized display string.
 *
 * @param type - Margin mode type ('cross' or 'isolated')
 * @returns Formatted display string ('Cross' or 'Isolated')
 *
 * @example
 * ```typescript
 * formatMarginMode('cross')     // 'Cross'
 * formatMarginMode('isolated')  // 'Isolated'
 * ```
 */
export function formatMarginMode(type: 'cross' | 'isolated'): 'Cross' | 'Isolated' {
  return type === 'cross' ? 'Cross' : 'Isolated';
}
