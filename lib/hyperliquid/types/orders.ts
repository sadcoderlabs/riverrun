/**
 * Type definitions for Hyperliquid orders
 */

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
  tif?: TimeInForce | null;
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
  cloid: `0x${string}` | null;
  reduceOnly: boolean;
  orderType: OrderType;
  isTrigger: boolean;
  triggerPx: string;
  triggerCondition: string;
  tif: TimeInForce | null;
  children?: ApiOrderResponse[];
  isPositionTpsl: boolean;
}
