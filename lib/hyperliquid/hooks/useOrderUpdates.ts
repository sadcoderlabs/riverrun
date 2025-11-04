/**
 * Hook to manage user's order updates using a hybrid approach:
 * 1. Fetches initial open orders using InfoClient on mount
 * 2. Subscribes to orderUpdates WebSocket for real-time incremental updates
 *
 * Returns orders in a tree structure preserving parent-child relationships
 */

import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';
import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { ApiOrderResponse, Order, OrderStatus, OrderType } from '../types/orders';
import { useHyperliquidClient } from './useHyperliquidClient';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseOrderUpdatesResult {
  /** All open orders in flat array */
  orders: Order[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * Infer order type from partial WebSocket data
 * WebSocket updates don't include orderType, so we infer from available fields
 */
function inferOrderType(apiOrder: ApiOrderResponse): OrderType {
  // If orderType is provided, use it
  if (apiOrder.orderType) {
    return apiOrder.orderType;
  }

  // Check if it's a trigger order
  const hasTrigger =
    apiOrder.isTrigger === true ||
    (apiOrder.triggerPx && apiOrder.triggerPx !== '0.0' && apiOrder.triggerPx !== '0');

  if (hasTrigger) {
    // Trigger order - need to determine if it's Stop or Take Profit
    // For now, default to Stop Market (most common)
    // Note: Without more data, we can't reliably distinguish Stop vs TP
    return apiOrder.limitPx === '0' || apiOrder.limitPx === '0.0' ? 'Stop Market' : 'Stop Limit';
  }

  // Regular order - check if Market or Limit
  // Market orders typically have tif='FrontendMarket' or very high/low limitPx
  if (apiOrder.tif === 'FrontendMarket' || apiOrder.tif === 'LiquidationMarket') {
    return 'Market';
  }

  // Default to Limit order
  return 'Limit';
}

/**
 * Transform API order response to typed Order
 */
function transformApiOrder(apiOrder: ApiOrderResponse): Order {
  // Infer order type if not provided (WebSocket case)
  const orderType = inferOrderType(apiOrder);
  const isTrigger =
    apiOrder.isTrigger === true ||
    (apiOrder.triggerPx && apiOrder.triggerPx !== '0.0' && apiOrder.triggerPx !== '0');

  // Build order based on whether it's a trigger order
  if (isTrigger) {
    // Build TriggerOrder
    const order: Order = {
      coin: apiOrder.coin,
      side: apiOrder.side,
      limitPx: apiOrder.limitPx,
      sz: apiOrder.sz,
      oid: apiOrder.oid,
      timestamp: apiOrder.timestamp,
      origSz: apiOrder.origSz,
      cloid: apiOrder.cloid ?? undefined,
      reduceOnly: apiOrder.reduceOnly ?? false,
      orderType: orderType as any, // Use inferred type
      tif: apiOrder.tif ?? null,
      isTrigger: true,
      triggerPx: apiOrder.triggerPx || '0.0',
      triggerCondition: apiOrder.triggerCondition || 'N/A',
    };

    return order;
  } else {
    // Build RegularOrder
    const order: Order = {
      coin: apiOrder.coin,
      side: apiOrder.side,
      limitPx: apiOrder.limitPx,
      sz: apiOrder.sz,
      oid: apiOrder.oid,
      timestamp: apiOrder.timestamp,
      origSz: apiOrder.origSz,
      cloid: apiOrder.cloid ?? undefined,
      reduceOnly: apiOrder.reduceOnly ?? false,
      orderType: orderType as any, // Use inferred type
      tif: apiOrder.tif ?? null,
    };

    return order;
  }
}

/**
 * Transform API order response to Order (simplified - direct transformation)
 */
function transformToOrder(apiOrder: ApiOrderResponse): Order {
  return transformApiOrder(apiOrder);
}

/**
 * Build a Map from orders array for efficient lookups by oid
 */
function buildOrderMap(orders: Order[]): Map<number, Order> {
  return new Map(orders.map(order => [order.oid, order]));
}

/**
 * Update orders array with new updates (simplified)
 * Returns new orders array with updates applied
 *
 * Note: WebSocket updates provide only partial order data (coin, side, sz, etc.)
 * but NOT orderType, isTrigger, triggerPx, etc. We must preserve existing order data.
 */
function updateOrders(
  currentOrders: Order[],
  updates: { order: ApiOrderResponse; status?: string }[],
): Order[] {
  // Build map of current orders for efficient lookup
  const orderMap = buildOrderMap(currentOrders);

  // Process each update
  updates.forEach(update => {
    const apiUpdate = update.order;
    // Use status from update if available, otherwise default to 'open'
    const status = (update.status as OrderStatus) || 'open';

    // If order is canceled or filled, remove it from the map
    if (status === 'canceled' || status === 'filled') {
      orderMap.delete(apiUpdate.oid);
    } else {
      // Check if this is an existing order
      const existingOrder = orderMap.get(apiUpdate.oid);

      if (existingOrder) {
        // Merge WebSocket update with existing order data
        // WebSocket provides: coin, side, limitPx, sz, oid, timestamp, origSz
        // Preserve from existing: orderType, isTrigger, triggerPx, triggerCondition, tif, reduceOnly, cloid
        const mergedOrder: Order = {
          ...existingOrder,
          // Update only the fields provided by WebSocket
          sz: apiUpdate.sz,
          limitPx: apiUpdate.limitPx,
          timestamp: apiUpdate.timestamp,
        };

        orderMap.set(apiUpdate.oid, mergedOrder);
      } else {
        // New order from WebSocket - transform normally
        const newOrder = transformToOrder(apiUpdate);
        orderMap.set(newOrder.oid, newOrder);
      }
    }
  });

  // Return flat array of orders
  return Array.from(orderMap.values());
}

// ============================================================================
// Main Hook
// ============================================================================

export function useOrderUpdates(): UseOrderUpdatesResult {
  const { address, isAuthenticated } = useActiveWallet();
  const { getSubscriptionClient, getInfoClient } = useHyperliquidClient();
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch {
        // Silently handle unsubscribe errors
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if conditions aren't met
    if (!isAuthenticated || !address) {
      setIsLoading(false);
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        // Cleanup any existing subscription
        await cleanup();

        // Step 1: Fetch initial open orders using InfoClient
        const infoClient = getInfoClient();

        // Use frontendOpenOrders to get full order data including orderType, triggerCondition, etc.
        const openOrdersResponse = (await infoClient.frontendOpenOrders({
          user: address,
        })) as ApiOrderResponse[];

        // Transform to Order array (flat structure)
        const initialOrders: Order[] = openOrdersResponse.map(apiOrder =>
          transformToOrder(apiOrder),
        );

        if (isMounted) {
          setOrders(initialOrders);
        }

        // Step 2: Subscribe to orderUpdates WebSocket for incremental updates
        const subscriptionClient = getSubscriptionClient();

        const subscription = await subscriptionClient.orderUpdates(
          {
            user: address,
          },
          (orderUpdates: any[]) => {
            if (isMounted) {
              setOrders(prevOrders => {
                // Keep the full update structure (includes status)
                const updates = orderUpdates.map(update => ({
                  order: update.order as ApiOrderResponse,
                  status: update.status as string | undefined,
                }));

                // Update orders array
                const newOrders = updateOrders(prevOrders, updates);

                // Check if we received any new orders (not in prevOrders)
                const prevOrderIds = new Set(prevOrders.map(order => order.oid));
                const hasNewOrders = orderUpdates.some(
                  update => update.status === 'open' && !prevOrderIds.has(update.order.oid),
                );

                // If we have new orders, refresh all open orders to get complete data
                if (hasNewOrders) {
                  void (async () => {
                    try {
                      const openOrdersResponse = (await infoClient.frontendOpenOrders({
                        user: address,
                      })) as ApiOrderResponse[];

                      const refreshedOrders: Order[] = openOrdersResponse.map(apiOrder =>
                        transformToOrder(apiOrder),
                      );

                      if (isMounted) {
                        setOrders(refreshedOrders);
                      }
                    } catch (err) {
                      console.error('[useOrderUpdates] Error refreshing orders:', err);
                    }
                  })();
                }

                return newOrders;
              });
            }
          },
        );

        subscriptionRef.current = subscription;

        if (isMounted) {
          setIsLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useOrderUpdates] Error setting up subscription:', err);
          setError(err instanceof Error ? err : new Error('Failed to subscribe'));
          setIsLoading(false);
        }
      }
    };

    void setupSubscription();

    // Cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
      void cleanup();
    };
  }, [address, isAuthenticated, cleanup, getSubscriptionClient, getInfoClient]);

  return {
    orders,
    isLoading,
    error,
  };
}

// Re-export types for convenience
export type { Order } from '../types/orders';
