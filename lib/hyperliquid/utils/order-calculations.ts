/**
 * Utility functions for order-related calculations
 */

import type { Order, OrderMetrics } from '../types/orders';

/**
 * Calculate all metrics for an order
 * - Price, size, filled amount, USD values, fill percentage
 */
export function calculateOrderMetrics(order: Order): OrderMetrics {
  const price = parseFloat(order.limitPx);
  const size = parseFloat(order.sz);
  const origSize = parseFloat(order.origSz);

  // Calculate filled amount
  const filledSize = origSize - size;
  const filledUSD = filledSize * price;
  const totalUSD = origSize * price;

  // Calculate fill percentage
  const fillPercentage = origSize > 0 ? (filledSize / origSize) * 100 : 0;

  return {
    price,
    size,
    origSize,
    filledSize,
    filledUSD,
    totalUSD,
    fillPercentage,
  };
}

/**
 * Check if an order has been partially filled
 */
export function isPartiallyFilled(order: Order): boolean {
  const size = parseFloat(order.sz);
  const origSize = parseFloat(order.origSz);
  return size < origSize && size > 0;
}

/**
 * Check if an order is fully filled
 */
export function isFullyFilled(order: Order): boolean {
  const size = parseFloat(order.sz);
  return size === 0;
}

/**
 * Get the remaining size of an order
 */
export function getRemainingSize(order: Order): number {
  return parseFloat(order.sz);
}

/**
 * Get the filled size of an order
 */
export function getFilledSize(order: Order): number {
  const size = parseFloat(order.sz);
  const origSize = parseFloat(order.origSz);
  return origSize - size;
}
