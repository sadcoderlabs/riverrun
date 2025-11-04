/**
 * Comprehensive type definitions for Hyperliquid orders
 * Eliminates the need for 'as any' casts and provides full type safety
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

export type OrderDirection = 'Buy' | 'Sell' | 'Close Long' | 'Close Short';

// ============================================================================
// Trigger Condition Types
// ============================================================================

export type TriggerOperator = 'above' | 'below';

export interface ParsedTriggerCondition {
  operator: TriggerOperator;
  price: string;
  formatted: string; // e.g., "Price ≤ 97,000"
}

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
 */
export interface RegularOrder extends BaseOrder {
  isTrigger?: false;
  triggerPx?: '0.0';
  triggerCondition?: 'N/A';
  orderType: 'Market' | 'Limit';
}

/**
 * Discriminated union of all order types
 */
export type Order = TriggerOrder | RegularOrder;

/**
 * Type guard to check if order is a trigger order
 */
export function isTriggerOrder(order: Order): order is TriggerOrder {
  return order.isTrigger === true;
}

/**
 * Type guard to check if order is a regular order
 */
export function isRegularOrder(order: Order): order is RegularOrder {
  return !order.isTrigger;
}

// ============================================================================
// Order Update Types (with status)
// ============================================================================

/**
 * Order with status information from WebSocket or API
 */
export interface OrderUpdate {
  order: Order;
  status: OrderStatus;
  statusTimestamp: number;
}

// ============================================================================
// Order Node Types (tree structure)
// ============================================================================

/**
 * Order node in tree structure, containing children (TP/SL orders)
 */
export interface OrderNode {
  order: Order;
  status: OrderStatus;
  statusTimestamp: number;
  children: OrderNode[];
}

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

/**
 * Display information for an order
 */
export interface OrderDisplay {
  type: OrderType;
  direction: OrderDirection;
  typeLabel: string; // e.g., "Buy Limit", "Close Long Stop Market"
  triggerCondition: ParsedTriggerCondition | null;
  isMarketOrder: boolean;
}

/**
 * Order with calculated metrics and display info
 */
export interface OrderWithMetrics extends OrderUpdate {
  metrics: OrderMetrics;
  display: OrderDisplay;
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
