/**
 * Order Context - Domain Types and Pure Functions
 *
 * This file contains all domain types and pure functions for the Order context.
 * These are framework-independent and can be used anywhere in the codebase.
 */

import { formatPrice } from '@/core/infra/hyperliquid/format/formatPrice';

// ============================================================================
// Basic Types
// ============================================================================

export type OrderType =
  | 'Market'
  | 'Limit'
  | 'Stop Market'
  | 'Stop Limit'
  | 'Take Profit Market'
  | 'Take Profit Limit';

export type OrderSide = 'B' | 'A'; // B = Buy/Bid, A = Ask/Sell

export type OrderStatus =
  | 'open'
  | 'filled'
  | 'canceled'
  | 'rejected'
  | 'triggered'
  | 'marginCanceled';

export type TimeInForce = 'Gtc' | 'Ioc' | 'Alo' | 'FrontendMarket' | 'LiquidationMarket';

export type TpSlType = 'tp' | 'sl';

// ============================================================================
// Order Interfaces
// ============================================================================

/**
 * Base order fields common to all order types
 */
export interface BaseOrder {
  coin: string;
  side: OrderSide;
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  origSz: string;
  cloid?: `0x${string}`;
  reduceOnly?: boolean;
  orderType: OrderType;
  tif?: TimeInForce | undefined;
}

/**
 * Trigger orders (Stop Market/Limit, Take Profit Market/Limit)
 */
export interface TriggerOrder extends BaseOrder {
  isTrigger: true;
  triggerPx: string;
  triggerCondition: string;
  orderType: 'Stop Market' | 'Stop Limit' | 'Take Profit Market' | 'Take Profit Limit';
}

/**
 * Regular orders (Market, Limit)
 * Also includes triggered Stop/TP orders (where isTrigger becomes false after triggering)
 */
export interface RegularOrder extends BaseOrder {
  isTrigger?: false;
  triggerPx?: string;
  triggerCondition?: string;
  orderType: 'Market' | 'Limit';
}

/**
 * Discriminated union of all order types
 */
export type Order = TriggerOrder | RegularOrder;

// ============================================================================
// Calculated Order Metrics
// ============================================================================

/**
 * Calculated metrics for an order
 */
export interface OrderMetrics {
  price: number;
  size: number;
  origSize: number;
  filledSize: number;
  filledUSD: number;
  totalUSD: number;
  fillPercentage: number;
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Raw order data from Hyperliquid API (frontendOpenOrders)
 * Used for typing API responses before transformation
 */
export interface ApiOrderResponse {
  coin: string;
  side: OrderSide;
  limitPx: string;
  sz: string;
  oid: number;
  timestamp: number;
  origSz: string;
  cloid: `0x${string}` | undefined;
  reduceOnly: boolean;
  orderType: OrderType;
  isTrigger: boolean;
  triggerPx: string;
  triggerCondition: string;
  tif: TimeInForce | undefined;
  children?: ApiOrderResponse[];
  isPositionTpsl: boolean;
}

// ============================================================================
// TP/SL Types
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
 * TP/SL configuration for order placement
 */
export interface TpSlConfig {
  tpTriggerPrice?: string;
  slTriggerPrice?: string;
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
 * Generic validation result
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ============================================================================
// Pure Functions - Type Checking
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
// Pure Functions - Order Calculations
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
// Pure Functions - Formatting
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
// Pure Functions - Display Helpers
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
// Pure Functions - TP/SL Price Calculations
// ============================================================================

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

// ============================================================================
// Pure Functions - TP/SL Validation
// ============================================================================

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

/**
 * Calculate TP/SL trigger prices from UI inputs
 *
 * Converts percentage inputs to USD prices using formatPrice
 * Returns undefined if no TP/SL values are provided
 *
 * @param inputs - TP/SL values from UI (can be USD or %)
 * @returns TP/SL configuration object or undefined
 */
export function calculateTpSlPrices(inputs: TpSlInputs): TpSlConfig | undefined {
  const result: TpSlConfig = {};

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
  tpSl: TpSlConfig | undefined,
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

// ============================================================================
// Order Operation Parameters
// ============================================================================

/**
 * Unified order placement parameters
 * Supports all order types through optional fields with clear semantics
 */
export interface PlaceOrderParams {
  // Required fields
  coin: string;
  side: 'Long' | 'Short';
  size: string;

  // Order type configuration
  orderType: 'Market' | 'Limit';
  limitPrice?: string; // Required if orderType === 'Limit'
  marketPrice?: number; // Required if orderType === 'Market'

  // Order behavior
  reduceOnly?: boolean;

  // TP/SL configuration (optional)
  tpSl?: {
    tpTriggerPrice?: string;
    tpLimitPrice?: string; // If omitted, TP executes as market order
    slTriggerPrice?: string;
    slLimitPrice?: string; // If omitted, SL executes as market order
  };
}

/**
 * Parameters for closing a position with market order
 */
export interface CloseMarketOrderParams {
  coin: string; // Asset symbol (e.g., 'BTC', 'ETH')
  side: 'Long' | 'Short'; // Order side: Long = buy (close short), Short = sell (close long)
  size: string; // Size to close (must match asset's decimal precision)
  marketPrice: string; // Current market price for extreme price calculation
}

/**
 * Parameters for closing a position with limit order
 */
export interface CloseLimitOrderParams {
  coin: string; // Asset symbol (e.g., 'BTC', 'ETH')
  side: 'Long' | 'Short'; // Order side: Long = buy (close short), Short = sell (close long)
  size: string; // Size to close
  price: string; // Limit price
}

/**
 * Parameters for placing TP/SL orders on a position
 */
export interface TpSlOrderParams {
  coin: string; // Asset symbol
  isLong: boolean; // Position direction
  size: string; // Order size (entire position or configured amount)
  // Take Profit parameters (optional)
  tpTriggerPrice?: string; // Trigger price for TP
  tpLimitPrice?: string; // Limit price for TP (if not provided, market order with 10% slippage)
  // Stop Loss parameters (optional)
  slTriggerPrice?: string; // Trigger price for SL
  slLimitPrice?: string; // Limit price for SL (if not provided, market order with 10% slippage)
}

/**
 * Parameters for canceling an order
 */
export interface CancelOrderParams {
  coin: string;
  orderId: number;
}

/**
 * Parameters for canceling multiple orders
 */
export interface CancelOrdersParams {
  orders: { coin: string; orderId: number }[];
}

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result type for order operations
 * Used instead of throwing exceptions for clearer error handling
 */
export interface OrderResult {
  success: boolean;
  error?: string;
}
