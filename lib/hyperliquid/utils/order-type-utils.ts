/**
 * Utility functions for order type identification and direction determination
 */

import type { Order, OrderType, OrderDirection } from '../types/orders';

/**
 * Get the order type from an order
 */
export function getOrderType(order: Order): OrderType {
  return order.orderType;
}

/**
 * Check if an order is a market order (any type of market execution)
 */
export function isMarketOrder(orderType: OrderType): boolean {
  return (
    orderType === 'Market' || orderType === 'Stop Market' || orderType === 'Take Profit Market'
  );
}

/**
 * Check if an order is a trigger order (Stop or Take Profit)
 */
export function isTriggerOrderType(orderType: OrderType): boolean {
  return orderType.includes('Stop') || orderType.includes('Take Profit');
}

/**
 * Check if an order is a stop order
 */
export function isStopOrder(orderType: OrderType): boolean {
  return orderType.includes('Stop');
}

/**
 * Check if an order is a take profit order
 */
export function isTakeProfitOrder(orderType: OrderType): boolean {
  return orderType.includes('Take Profit');
}

/**
 * Get the order direction based on order type and side
 * - For trigger orders: "Close Long" or "Close Short"
 * - For regular orders: "Buy" or "Sell"
 */
export function getOrderDirection(order: Order): OrderDirection {
  const orderType = getOrderType(order);
  const isBuy = order.side === 'B';

  // For trigger orders (Stop/TP), they're typically reduce-only
  if (isTriggerOrderType(orderType)) {
    // Close long = Sell (side A), Close short = Buy (side B)
    return isBuy ? 'Close Short' : 'Close Long';
  }

  // For regular orders
  return isBuy ? 'Buy' : 'Sell';
}

/**
 * Get a full order type label combining direction and type
 * Examples:
 * - "Buy Limit"
 * - "Sell Market"
 * - "Close Long Stop Market"
 * - "Close Short Take Profit Market"
 */
export function getOrderTypeLabel(order: Order): string {
  const orderType = getOrderType(order);
  const direction = getOrderDirection(order);

  // For limit and market orders, show direction + type
  if (orderType === 'Limit' || orderType === 'Market') {
    return `${direction} ${orderType}`;
  }

  // For trigger orders, show direction + full type
  return `${direction} ${orderType}`;
}
