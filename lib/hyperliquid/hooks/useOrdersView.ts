/**
 * Hook for processing and displaying orders
 * Handles filtering, sorting, and computing display metadata
 */

import { useMemo } from 'react';
import { useOrderUpdates } from './useOrderUpdates';
import type { OrderNode, OrderWithMetrics, OrderStatus } from '../types/orders';
import { calculateOrderMetrics } from '../utils/order-calculations';
import {
  getOrderType,
  getOrderDirection,
  getOrderTypeLabel,
  isMarketOrder,
} from '../utils/order-type-utils';
import { parseTriggerCondition } from '../utils/trigger-utils';

// ============================================================================
// Hook Options
// ============================================================================

export interface OrdersViewOptions {
  /** Filter by order status (default: ['open']) */
  filterStatus?: OrderStatus[];
  /** Sort field (default: 'timestamp') */
  sortBy?: 'timestamp' | 'coin' | 'size' | 'oid';
  /** Sort direction (default: 'desc') */
  sortOrder?: 'asc' | 'desc';
  /** Include children in flat view (default: true) */
  includeChildren?: boolean;
}

export interface UseOrdersViewResult {
  /** Processed orders with metrics and display info */
  orders: OrderWithMetrics[];
  /** Loading state from useOrderUpdates */
  isLoading: boolean;
  /** Error state from useOrderUpdates */
  error: Error | undefined;
}

// ============================================================================
// Sorting Functions
// ============================================================================

function sortOrders(
  orders: OrderWithMetrics[],
  sortBy: OrdersViewOptions['sortBy'] = 'timestamp',
  sortOrder: OrdersViewOptions['sortOrder'] = 'desc',
): OrderWithMetrics[] {
  const sorted = [...orders];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case 'timestamp':
        comparison = a.order.timestamp - b.order.timestamp;
        break;
      case 'coin':
        comparison = a.order.coin.localeCompare(b.order.coin);
        break;
      case 'size':
        comparison = a.metrics.size - b.metrics.size;
        break;
      case 'oid':
        comparison = a.order.oid - b.order.oid;
        break;
    }

    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return sorted;
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * Process orders from useOrderUpdates and add display metadata
 */
export function useOrdersView(options: OrdersViewOptions = {}): UseOrdersViewResult {
  const {
    filterStatus = ['open'],
    sortBy = 'timestamp',
    sortOrder = 'desc',
    includeChildren = true,
  } = options;

  // Get raw order data
  const { flatOrders, isLoading, error } = useOrderUpdates();

  // Process orders
  const processedOrders = useMemo(() => {
    // Filter by status
    let filtered = flatOrders.filter(node => filterStatus.includes(node.status));

    // Filter children if needed
    if (!includeChildren) {
      filtered = filtered.filter(node => node.children.length === 0);
    }

    // Transform to OrderWithMetrics
    const withMetrics: OrderWithMetrics[] = filtered.map(node => {
      const metrics = calculateOrderMetrics(node.order);
      const orderType = getOrderType(node.order);

      return {
        order: node.order,
        status: node.status,
        statusTimestamp: node.statusTimestamp,
        metrics,
        display: {
          type: orderType,
          direction: getOrderDirection(node.order),
          typeLabel: getOrderTypeLabel(node.order),
          triggerCondition: parseTriggerCondition(node.order),
          isMarketOrder: isMarketOrder(orderType),
        },
      };
    });

    // Sort
    return sortOrders(withMetrics, sortBy, sortOrder);
  }, [flatOrders, filterStatus, includeChildren, sortBy, sortOrder]);

  return {
    orders: processedOrders,
    isLoading,
    error,
  };
}
