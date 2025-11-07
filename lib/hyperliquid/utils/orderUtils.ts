/**
 * Utility functions for order operations
 * Includes type checking, calculations, formatting, and display helpers
 */

import type { Order, OrderMetrics, OrderType } from '../types/orders';
import type { PlaceOrderParams } from '../hooks/useOrder';
import { calculatePriceFromPercent, validatePrice } from './tpslUtils';

// ============================================================================
// Type Checking
// ============================================================================

/**
 * Check if an order is a market order (any type of market execution)
 */
export function isMarketOrder(orderType: OrderType): boolean {
  return (
    orderType === 'Market' || orderType === 'Stop Market' || orderType === 'Take Profit Market'
  );
}

// ============================================================================
// Calculations
// ============================================================================

/**
 * Calculate all metrics for an order
 * - Price, size, filled amount, USD values, fill percentage
 */
export function calculateOrderMetrics(order: Order): OrderMetrics {
  const price = parseFloat(order.limitPx);
  const remainingSize = parseFloat(order.sz); // Current remaining unfilled size
  const origSize = parseFloat(order.origSz); // Original order size

  // Calculate filled amount
  const filledSize = origSize - remainingSize;
  const filledUSD = filledSize * price;
  const totalUSD = origSize * price;

  // Calculate fill percentage
  const fillPercentage = origSize > 0 ? (filledSize / origSize) * 100 : 0;

  return {
    price,
    size: origSize, // Return original size for display (Filled / Total)
    origSize,
    filledSize,
    filledUSD,
    totalUSD,
    fillPercentage,
  };
}

// ============================================================================
// Formatting
// ============================================================================

/**
 * Format timestamp to YYYY-MM-DD HH:MM:SS (24-hour format)
 */
export function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// Display Helpers
// ============================================================================

/**
 * Get order direction based on side and type
 */
export function getOrderDirection(order: Order): string {
  const isBuy = order.side === 'B';
  const orderType = order.orderType;

  // For trigger orders (Stop/TP), they're reduce-only
  if (orderType.includes('Stop') || orderType.includes('Take Profit')) {
    return isBuy ? 'Close Short' : 'Close Long';
  }

  // For regular orders
  return isBuy ? 'Long' : 'Short';
}

// ============================================================================
// TP/SL Order Placement Helpers
// ============================================================================

/**
 * TP/SL input data from UI
 */
export interface TpSlInputs {
  tpValue: string;
  tpUnit: 'USD' | '%';
  slValue: string;
  slUnit: 'USD' | '%';
  entryPrice: number;
  isLong: boolean;
  szDecimals: number;
}

/**
 * Calculate TP/SL trigger prices from UI inputs
 *
 * Converts percentage inputs to USD prices using formatPrice
 * Returns undefined if no TP/SL values are provided
 *
 * @param inputs - TP/SL values from UI (can be USD or %)
 * @returns TP/SL configuration object or undefined
 */
export function calculateTpSlPrices(inputs: TpSlInputs): PlaceOrderParams['tpSl'] | undefined {
  const result: NonNullable<PlaceOrderParams['tpSl']> = {};

  // Process TP
  if (inputs.tpValue) {
    const tpNum = parseFloat(inputs.tpValue);
    if (isFinite(tpNum) && tpNum > 0) {
      result.tpTriggerPrice =
        inputs.tpUnit === '%'
          ? calculatePriceFromPercent(
              inputs.entryPrice,
              tpNum,
              inputs.isLong,
              'tp',
              inputs.szDecimals,
            )
          : inputs.tpValue;
    }
  }

  // Process SL
  if (inputs.slValue) {
    const slNum = parseFloat(inputs.slValue);
    if (isFinite(slNum) && slNum > 0) {
      result.slTriggerPrice =
        inputs.slUnit === '%'
          ? calculatePriceFromPercent(
              inputs.entryPrice,
              slNum,
              inputs.isLong,
              'sl',
              inputs.szDecimals,
            )
          : inputs.slValue;
    }
  }

  // Return undefined if no TP/SL was provided
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Validation result for TP/SL prices
 */
export interface TpSlValidationResult {
  valid: boolean;
  error?: {
    title: string;
    description: string;
  };
}

/**
 * Validate TP/SL trigger prices
 *
 * Ensures TP/SL prices are valid relative to entry price:
 * - Long TP must be > entry
 * - Long SL must be < entry
 * - Short TP must be < entry
 * - Short SL must be > entry
 *
 * @param tpSl - TP/SL configuration to validate
 * @param entryPrice - Expected entry price
 * @param isLong - Position direction
 * @returns Validation result with error details if invalid
 */
export function validateTpSl(
  tpSl: PlaceOrderParams['tpSl'],
  entryPrice: number,
  isLong: boolean,
): TpSlValidationResult {
  if (!tpSl) {
    return { valid: true };
  }

  // Validate TP
  if (tpSl.tpTriggerPrice) {
    const tpValid = validatePrice(tpSl.tpTriggerPrice, entryPrice, isLong, 'tp');
    if (!tpValid.valid) {
      return {
        valid: false,
        error: {
          title: 'Invalid TP',
          description: tpValid.error || 'Invalid take profit price',
        },
      };
    }
  }

  // Validate SL
  if (tpSl.slTriggerPrice) {
    const slValid = validatePrice(tpSl.slTriggerPrice, entryPrice, isLong, 'sl');
    if (!slValid.valid) {
      return {
        valid: false,
        error: {
          title: 'Invalid SL',
          description: slValid.error || 'Invalid stop loss price',
        },
      };
    }
  }

  return { valid: true };
}
