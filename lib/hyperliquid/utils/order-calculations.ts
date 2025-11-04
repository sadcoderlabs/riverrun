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
