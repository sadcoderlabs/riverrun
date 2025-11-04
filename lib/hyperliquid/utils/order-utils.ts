/**
 * Utility functions for order operations
 * Includes type checking, calculations, formatting, and display helpers
 */

import type { Order, OrderMetrics, OrderType } from '../types/orders';

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
