/**
 * Utility functions for parsing and formatting trigger conditions
 */

import type {
  Order,
  OrderType,
  OrderSide,
  TriggerOperator,
  ParsedTriggerCondition,
} from '../types/orders';
import { formatPrice } from '../format/formatPrice';
import { isTriggerOrder } from '../types/orders';

/**
 * Parse trigger condition from an order
 * Returns null if order is not a trigger order or has no valid trigger condition
 */
export function parseTriggerCondition(order: Order): ParsedTriggerCondition | null {
  // Check if this is a trigger order
  if (!isTriggerOrder(order)) {
    return null;
  }

  const { triggerCondition, triggerPx, orderType, side } = order;

  // If no trigger condition or it's N/A, try to build from triggerPx
  if (!triggerCondition || triggerCondition === 'N/A') {
    if (!triggerPx || triggerPx === '0.0') {
      return null;
    }

    // Derive from order type and side
    return deriveTriggerCondition(orderType, side, triggerPx);
  }

  // Parse string trigger condition (e.g., "Price below 97000")
  return parseStringTriggerCondition(triggerCondition);
}

/**
 * Derive trigger condition from order type, side, and trigger price
 */
function deriveTriggerCondition(
  orderType: OrderType,
  side: OrderSide,
  triggerPx: string,
): ParsedTriggerCondition {
  const isStop = orderType.includes('Stop');

  // Determine operator based on order type and side
  // Stop orders: trigger when price moves against position
  // - Sell (A) stops trigger when price goes down (≤)
  // - Buy (B) stops trigger when price goes up (≥)
  // Take profit orders: trigger when price moves in favor
  // - Sell (A) TP triggers when price goes up (≥)
  // - Buy (B) TP triggers when price goes down (≤)
  let operator: TriggerOperator;
  if (isStop) {
    operator = side === 'A' ? 'below' : 'above';
  } else {
    operator = side === 'A' ? 'above' : 'below';
  }

  const formatted = formatTriggerCondition(operator, triggerPx);

  return {
    operator,
    price: triggerPx,
    formatted,
  };
}

/**
 * Parse string trigger condition (e.g., "Price below 97000" or "Price above 105000")
 */
function parseStringTriggerCondition(conditionStr: string): ParsedTriggerCondition | null {
  // Try to parse "Price below X" pattern
  const belowMatch = conditionStr.match(/below\s+([\d,\.]+)/i);
  if (belowMatch) {
    const price = belowMatch[1];
    return {
      operator: 'below',
      price,
      formatted: formatTriggerCondition('below', price),
    };
  }

  // Try to parse "Price above X" pattern
  const aboveMatch = conditionStr.match(/above\s+([\d,\.]+)/i);
  if (aboveMatch) {
    const price = aboveMatch[1];
    return {
      operator: 'above',
      price,
      formatted: formatTriggerCondition('above', price),
    };
  }

  // If we can't parse, return the original string as formatted
  return {
    operator: 'above', // default
    price: '0',
    formatted: conditionStr,
  };
}

/**
 * Format a trigger condition for display
 * @param operator - 'above' or 'below'
 * @param price - trigger price as string
 * @returns Formatted string like "Price ≤ 97,000" or "Price ≥ 105,000"
 */
export function formatTriggerCondition(operator: TriggerOperator, price: string): string {
  const symbol = operator === 'above' ? '≥' : '≤';
  const formattedPrice = formatPrice(parseFloat(price), 2, true);
  return `Price ${symbol} ${formattedPrice}`;
}
