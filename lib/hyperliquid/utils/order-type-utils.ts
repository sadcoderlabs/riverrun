/**
 * Utility functions for order type identification
 */

import type { OrderType } from '../types/orders';

/**
 * Check if an order is a market order (any type of market execution)
 */
export function isMarketOrder(orderType: OrderType): boolean {
  return (
    orderType === 'Market' || orderType === 'Stop Market' || orderType === 'Take Profit Market'
  );
}
