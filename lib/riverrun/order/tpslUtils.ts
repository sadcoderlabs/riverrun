/**
 * TP/SL Calculation and Validation Utilities
 *
 * Handles price/percentage conversions and validation for Take Profit and Stop Loss orders
 */

import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';

/**
 * Type of TP/SL order
 */
export type TpSlType = 'tp' | 'sl';

/**
 * Unified price calculation from percentage
 * Handles both TP and SL based on type
 *
 * @param entryPrice - Entry price of the position
 * @param percent - Percentage gain/loss (e.g., 10 for 10%)
 * @param isLong - True for long positions, false for short
 * @param type - 'tp' for Take Profit, 'sl' for Stop Loss
 * @param szDecimals - Size decimals for the asset (used to calculate price decimals)
 * @returns Trigger price formatted with formatPrice (no thousand separators)
 *
 * Examples:
 * - TP Long: entryPrice=100, percent=10, isLong=true, type='tp' → 110 (10% above entry)
 * - TP Short: entryPrice=100, percent=10, isLong=false, type='tp' → 90 (10% below entry)
 * - SL Long: entryPrice=100, percent=5, isLong=true, type='sl' → 95 (5% below entry)
 * - SL Short: entryPrice=100, percent=5, isLong=false, type='sl' → 105 (5% above entry)
 */
export function calculatePriceFromPercent(
  entryPrice: number,
  percent: number,
  isLong: boolean,
  type: TpSlType,
  szDecimals: number,
): string {
  // TP: Long increases, Short decreases
  // SL: Long decreases, Short increases
  const shouldIncrease = (type === 'tp' && isLong) || (type === 'sl' && !isLong);

  const price = shouldIncrease
    ? entryPrice * (1 + percent / 100)
    : entryPrice * (1 - percent / 100);

  return formatPrice(price, szDecimals, false);
}

/**
 * Unified percentage calculation from price
 * Handles both TP and SL based on type
 *
 * @param entryPrice - Entry price of the position
 * @param targetPrice - Target trigger price (TP or SL)
 * @param isLong - True for long positions, false for short
 * @param type - 'tp' for Take Profit, 'sl' for Stop Loss
 * @returns Percentage gain/loss as string with 2 decimal places
 *
 * Examples:
 * - TP Long: entryPrice=100, targetPrice=110, isLong=true, type='tp' → "10.00" (10% gain)
 * - TP Short: entryPrice=100, targetPrice=90, isLong=false, type='tp' → "10.00" (10% gain)
 * - SL Long: entryPrice=100, targetPrice=95, isLong=true, type='sl' → "5.00" (5% loss)
 * - SL Short: entryPrice=100, targetPrice=105, isLong=false, type='sl' → "5.00" (5% loss)
 */
export function calculatePercentFromPrice(
  entryPrice: number,
  targetPrice: number,
  isLong: boolean,
  type: TpSlType,
): string {
  // TP: Long increases, Short decreases
  // SL: Long decreases, Short increases
  const shouldIncrease = (type === 'tp' && isLong) || (type === 'sl' && !isLong);

  const percent = shouldIncrease
    ? ((targetPrice - entryPrice) / entryPrice) * 100
    : ((entryPrice - targetPrice) / entryPrice) * 100;

  return percent.toFixed(2);
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Unified validation for TP/SL prices
 * Handles both TP and SL based on type
 *
 * Rules:
 * - Long TP: must be > entry price (price increases to take profit)
 * - Short TP: must be < entry price (price decreases to take profit)
 * - Long SL: must be < entry price (price decreases to stop loss)
 * - Short SL: must be > entry price (price increases to stop loss)
 *
 * @param price - Trigger price (TP or SL)
 * @param entryPrice - Entry price of the position
 * @param isLong - True for long positions, false for short
 * @param type - 'tp' for Take Profit, 'sl' for Stop Loss
 * @returns Validation result with error message if invalid
 *
 * Examples:
 * - validatePrice(110, 100, true, 'tp') → valid (Long TP above entry)
 * - validatePrice(90, 100, true, 'tp') → invalid (Long TP below entry)
 * - validatePrice(90, 100, false, 'tp') → valid (Short TP below entry)
 * - validatePrice(95, 100, true, 'sl') → valid (Long SL below entry)
 * - validatePrice(105, 100, false, 'sl') → valid (Short SL above entry)
 */
export function validatePrice(
  price: string | number,
  entryPrice: number,
  isLong: boolean,
  type: TpSlType,
): ValidationResult {
  const parsed = typeof price === 'string' ? parseFloat(price) : price;

  if (!isFinite(parsed) || parsed <= 0) {
    return {
      valid: false,
      error: `${type.toUpperCase()} price must be a valid positive number`,
    };
  }

  // TP: Long increases, Short decreases
  // SL: Long decreases, Short increases
  const shouldBeHigher = (type === 'tp' && isLong) || (type === 'sl' && !isLong);

  if (shouldBeHigher) {
    if (parsed <= entryPrice) {
      return {
        valid: false,
        error: `${isLong ? 'Long' : 'Short'} ${type.toUpperCase()} must be above entry price (${entryPrice})`,
      };
    }
  } else {
    if (parsed >= entryPrice) {
      return {
        valid: false,
        error: `${isLong ? 'Long' : 'Short'} ${type.toUpperCase()} must be below entry price (${entryPrice})`,
      };
    }
  }

  return { valid: true };
}
