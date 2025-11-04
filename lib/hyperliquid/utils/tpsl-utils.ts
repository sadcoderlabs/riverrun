/**
 * TP/SL Calculation and Validation Utilities
 *
 * Handles price/percentage conversions and validation for Take Profit and Stop Loss orders
 */

import { formatPrice } from '../format/formatPrice';

/**
 * Calculate Take Profit price from percentage gain
 *
 * @param entryPrice - Entry price of the position
 * @param percentGain - Percentage gain (e.g., 10 for 10%)
 * @param isLong - True for long positions, false for short
 * @param szDecimals - Size decimals for the asset (used to calculate price decimals)
 * @returns TP trigger price formatted with formatPrice (no thousand separators)
 *
 * Examples:
 * - Long: entryPrice=100, percentGain=10 → 110 (10% above entry)
 * - Short: entryPrice=100, percentGain=10 → 90 (10% below entry)
 */
export function calculateTpPriceFromPercent(
  entryPrice: number,
  percentGain: number,
  isLong: boolean,
  szDecimals: number,
): string {
  let price: number;
  if (isLong) {
    // Long TP: price increases by percentGain
    price = entryPrice * (1 + percentGain / 100);
  } else {
    // Short TP: price decreases by percentGain
    price = entryPrice * (1 - percentGain / 100);
  }

  // Format price without thousand separators for API compatibility
  return formatPrice(price, szDecimals, false);
}

/**
 * Calculate Stop Loss price from percentage loss
 *
 * @param entryPrice - Entry price of the position
 * @param percentLoss - Percentage loss (e.g., 5 for 5%)
 * @param isLong - True for long positions, false for short
 * @param szDecimals - Size decimals for the asset (used to calculate price decimals)
 * @returns SL trigger price formatted with formatPrice (no thousand separators)
 *
 * Examples:
 * - Long: entryPrice=100, percentLoss=5 → 95 (5% below entry)
 * - Short: entryPrice=100, percentLoss=5 → 105 (5% above entry)
 */
export function calculateSlPriceFromPercent(
  entryPrice: number,
  percentLoss: number,
  isLong: boolean,
  szDecimals: number,
): string {
  let price: number;
  if (isLong) {
    // Long SL: price decreases by percentLoss
    price = entryPrice * (1 - percentLoss / 100);
  } else {
    // Short SL: price increases by percentLoss
    price = entryPrice * (1 + percentLoss / 100);
  }

  // Format price without thousand separators for API compatibility
  return formatPrice(price, szDecimals, false);
}

/**
 * Calculate Take Profit percentage from price
 *
 * @param entryPrice - Entry price of the position
 * @param tpPrice - Take Profit trigger price
 * @param isLong - True for long positions, false for short
 * @returns Percentage gain
 *
 * Examples:
 * - Long: entryPrice=100, tpPrice=110 → 10 (10% gain)
 * - Short: entryPrice=100, tpPrice=90 → 10 (10% gain)
 */
export function calculateTpPercentFromPrice(
  entryPrice: number,
  tpPrice: number,
  isLong: boolean,
): string {
  if (isLong) {
    // Long: (tpPrice - entryPrice) / entryPrice * 100
    const percent = ((tpPrice - entryPrice) / entryPrice) * 100;
    return percent.toFixed(2);
  } else {
    // Short: (entryPrice - tpPrice) / entryPrice * 100
    const percent = ((entryPrice - tpPrice) / entryPrice) * 100;
    return percent.toFixed(2);
  }
}

/**
 * Calculate Stop Loss percentage from price
 *
 * @param entryPrice - Entry price of the position
 * @param slPrice - Stop Loss trigger price
 * @param isLong - True for long positions, false for short
 * @returns Percentage loss
 *
 * Examples:
 * - Long: entryPrice=100, slPrice=95 → 5 (5% loss)
 * - Short: entryPrice=100, slPrice=105 → 5 (5% loss)
 */
export function calculateSlPercentFromPrice(
  entryPrice: number,
  slPrice: number,
  isLong: boolean,
): string {
  if (isLong) {
    // Long: (entryPrice - slPrice) / entryPrice * 100
    const percent = ((entryPrice - slPrice) / entryPrice) * 100;
    return percent.toFixed(2);
  } else {
    // Short: (slPrice - entryPrice) / entryPrice * 100
    const percent = ((slPrice - entryPrice) / entryPrice) * 100;
    return percent.toFixed(2);
  }
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
