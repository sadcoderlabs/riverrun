/**
 * Hook to manage user's order updates using a hybrid approach:
 * 1. Fetches initial open orders using InfoClient on mount
 * 2. Subscribes to orderUpdates WebSocket for real-time incremental updates
 *
 * Returns orders in a tree structure preserving parent-child relationships
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
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
    // Note: Triggered Stop/TP orders have isTrigger=false but still contain triggerCondition
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
      // Preserve trigger information even for non-trigger orders (e.g., triggered stop/TP orders)
      triggerPx: apiOrder.triggerPx,
      triggerCondition: apiOrder.triggerCondition,
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

/**
 * Check if an update contains an order that was immediately rejected/canceled
 * (never existed in our current orders and came with failed status)
 */
function hasImmediatelyCanceledOrders(
  currentOrders: Order[],
  updates: { order: ApiOrderResponse; status?: string }[],
): boolean {
  const currentOrderIds = new Set(currentOrders.map(order => order.oid));

  // All possible rejected/canceled status values from Hyperliquid API
  // Source: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-order-status-by-oid-or-cloid
  const failedStatuses = [
    // User canceled
    'canceled',
    // System rejected at placement
    'rejected',
    'tickRejected',
    'minTradeNtlRejected',
    'perpMarginRejected',
    'reduceOnlyRejected',
    'badAloPxRejected',
    'iocCancelRejected',
    'badTriggerPxRejected',
    'marketOrderNoLiquidityRejected',
    'positionIncreaseAtOpenInterestCapRejected',
    'positionFlipAtOpenInterestCapRejected',
    'tooAggressiveAtOpenInterestCapRejected',
    'openInterestIncreaseRejected',
    'insufficientSpotBalanceRejected',
    'oracleRejected',
    'perpMaxPositionRejected',
    // System canceled after placement
    'marginCanceled',
    'vaultWithdrawalCanceled',
    'openInterestCapCanceled',
    'selfTradeCanceled',
    'reduceOnlyCanceled',
    'siblingFilledCanceled',
    'delistedCanceled',
    'liquidatedCanceled',
    'scheduledCancel',
  ];

  return updates.some(update => {
    const status = update.status;
    const oid = update.order.oid;

    // If this is a new order (not in current orders) and it has a failed status
    // This indicates a failed order that was rejected by the system
    return !currentOrderIds.has(oid) && status && failedStatuses.includes(status);
  });
}

// ============================================================================
// Main Hook
// ============================================================================

export function useOrderUpdates(): UseOrderUpdatesResult {
  const { wallet } = useActiveWallet();
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
    if (!wallet) {
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
          user: wallet.address,
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
            user: wallet.address,
          },
          (orderUpdates: any[]) => {
            if (isMounted) {
              setOrders(prevOrders => {
                // Keep the full update structure (includes status)
                const updates = orderUpdates.map(update => ({
                  order: update.order as ApiOrderResponse,
                  status: update.status as string | undefined,
                }));

                // Check if any orders were immediately rejected/canceled (failed orders)
                // These are orders that never existed in prevOrders and came with failed status
                const hasFailedOrders = hasImmediatelyCanceledOrders(prevOrders, updates);

                // If we detect failed orders, filter them out
                // This prevents orders that were rejected by the API from appearing in the UI
                if (hasFailedOrders) {
                  const prevOrderIds = new Set(prevOrders.map(order => order.oid));

                  // All possible rejected/canceled status values (same as hasImmediatelyCanceledOrders)
                  const failedStatuses = [
                    'canceled',
                    'rejected',
                    'tickRejected',
                    'minTradeNtlRejected',
                    'perpMarginRejected',
                    'reduceOnlyRejected',
                    'badAloPxRejected',
                    'iocCancelRejected',
                    'badTriggerPxRejected',
                    'marketOrderNoLiquidityRejected',
                    'positionIncreaseAtOpenInterestCapRejected',
                    'positionFlipAtOpenInterestCapRejected',
                    'tooAggressiveAtOpenInterestCapRejected',
                    'openInterestIncreaseRejected',
                    'insufficientSpotBalanceRejected',
                    'oracleRejected',
                    'perpMaxPositionRejected',
                    'marginCanceled',
                    'vaultWithdrawalCanceled',
                    'openInterestCapCanceled',
                    'selfTradeCanceled',
                    'reduceOnlyCanceled',
                    'siblingFilledCanceled',
                    'delistedCanceled',
                    'liquidatedCanceled',
                    'scheduledCancel',
                  ];

                  // Filter out the failed orders from updates
                  const validUpdates = updates.filter(update => {
                    const status = update.status;
                    const oid = update.order.oid;
                    // Keep only orders that either existed before OR don't have a failed status
                    const isFailed = status && failedStatuses.includes(status);
                    return prevOrderIds.has(oid) || !isFailed;
                  });

                  // Update orders with only valid updates
                  return updateOrders(prevOrders, validUpdates);
                }

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
                        user: wallet.address,
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
  }, [wallet, cleanup, getSubscriptionClient, getInfoClient]);

  return {
    orders,
    isLoading,
    error,
  };
}

// Re-export types for convenience
export type { Order } from '../types/orders';
