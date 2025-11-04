/**
 * TP/SL Calculation and Validation Utilities
 *
 * Handles price/percentage conversions and validation for Take Profit and Stop Loss orders
 */

import { formatPrice } from '../format/formatPrice';

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
 * Validate Take Profit price
 *
 * Rules:
 * - Long TP: must be > entry price
 * - Short TP: must be < entry price
 *
 * @param tpPrice - Take Profit trigger price
 * @param entryPrice - Entry price
 * @param isLong - True for long positions, false for short
 * @returns Validation result with error message if invalid
 */
export function validateTpPrice(
  tpPrice: string | number,
  entryPrice: number,
  isLong: boolean,
): ValidationResult {
  const tp = typeof tpPrice === 'string' ? parseFloat(tpPrice) : tpPrice;

  if (!isFinite(tp) || tp <= 0) {
    return { valid: false, error: 'TP price must be a valid positive number' };
  }

  if (isLong) {
    if (tp <= entryPrice) {
      return {
        valid: false,
        error: `Long TP must be above entry price (${entryPrice})`,
      };
    }
  } else {
    if (tp >= entryPrice) {
      return {
        valid: false,
        error: `Short TP must be below entry price (${entryPrice})`,
      };
    }
  }

  return { valid: true };
}

/**
 * Validate Stop Loss price
 *
 * Rules:
 * - Long SL: must be < entry price
 * - Short SL: must be > entry price
 *
 * @param slPrice - Stop Loss trigger price
 * @param entryPrice - Entry price
 * @param isLong - True for long positions, false for short
 * @returns Validation result with error message if invalid
 */
export function validateSlPrice(
  slPrice: string | number,
  entryPrice: number,
  isLong: boolean,
): ValidationResult {
  const sl = typeof slPrice === 'string' ? parseFloat(slPrice) : slPrice;

  if (!isFinite(sl) || sl <= 0) {
    return { valid: false, error: 'SL price must be a valid positive number' };
  }

  if (isLong) {
    if (sl >= entryPrice) {
      return {
        valid: false,
        error: `Long SL must be below entry price (${entryPrice})`,
      };
    }
  } else {
    if (sl <= entryPrice) {
      return {
        valid: false,
        error: `Short SL must be above entry price (${entryPrice})`,
      };
    }
  }

  return { valid: true };
}
