/**
 * Hook to manage user's order updates using a hybrid approach:
 * 1. Fetches initial open orders using InfoClient on mount
 * 2. Subscribes to orderUpdates WebSocket for real-time incremental updates
 *
 * Returns orders in a tree structure preserving parent-child relationships
 */

import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHyperliquidClient } from './useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';
import type { Order, OrderNode, OrderStatus, ApiOrderResponse } from '../types/orders';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseOrderUpdatesResult {
  /** All orders in flat array (simplified from previous tree structure) */
  orders: OrderNode[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// Transformation Utilities
// ============================================================================

/**
 * Transform API order response to typed Order
 */
function transformApiOrder(apiOrder: ApiOrderResponse): Order {
  // Create base order structure
  const order: Order = {
    coin: apiOrder.coin,
    side: apiOrder.side,
    limitPx: apiOrder.limitPx,
    sz: apiOrder.sz,
    oid: apiOrder.oid,
    timestamp: apiOrder.timestamp,
    origSz: apiOrder.origSz,
    cloid: apiOrder.cloid ?? undefined,
    reduceOnly: apiOrder.reduceOnly,
    orderType: apiOrder.orderType,
    tif: apiOrder.tif,
  } as Order;

  // Add trigger-specific fields if this is a trigger order
  if (apiOrder.isTrigger) {
    (order as any).isTrigger = true;
    (order as any).triggerPx = apiOrder.triggerPx;
    (order as any).triggerCondition = apiOrder.triggerCondition;
  }

  return order;
}

/**
 * Transform API order response to OrderNode (simplified - no children processing)
 */
function transformToOrderNode(apiOrder: ApiOrderResponse, status: OrderStatus = 'open'): OrderNode {
  const order = transformApiOrder(apiOrder);

  return {
    order,
    status,
    statusTimestamp: apiOrder.timestamp,
  };
}

/**
 * Build a Map from orders array for efficient lookups by oid
 */
function buildOrderMap(orders: OrderNode[]): Map<number, OrderNode> {
  return new Map(orders.map(node => [node.order.oid, node]));
}

/**
 * Update orders array with new updates (simplified - no tree logic)
 * Returns new orders array with updates applied
 */
function updateOrders(
  currentOrders: OrderNode[],
  updates: Array<{ order: ApiOrderResponse; status?: string }>,
): OrderNode[] {
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
      // Update or insert order
      const updatedNode = transformToOrderNode(apiUpdate, status);
      orderMap.set(updatedNode.order.oid, updatedNode);
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
  const [orders, setOrders] = useState<OrderNode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('[useOrderUpdates] Error unsubscribing from orderUpdates:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    console.log('[useOrderUpdates] Effect triggered:', {
      isAuthenticated,
      address,
      hasAddress: !!address,
    });

    // Don't subscribe if conditions aren't met
    if (!isAuthenticated || !address) {
      if (!address && isAuthenticated) {
        console.warn('[useOrderUpdates] Wallet authenticated but address not available');
      }
      console.log('[useOrderUpdates] Conditions not met, skipping subscription');
      setIsLoading(false);
      setOrders([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        console.log('[useOrderUpdates] Setting up subscription for user:', address);

        // Cleanup any existing subscription
        await cleanup();

        // Step 1: Fetch initial open orders using InfoClient
        const infoClient = getInfoClient();
        console.log('[useOrderUpdates] Fetching initial open orders...');

        // Use frontendOpenOrders to get full order data including orderType, triggerCondition, etc.
        const openOrdersResponse = (await infoClient.frontendOpenOrders({
          user: address,
        })) as ApiOrderResponse[];

        console.log('[useOrderUpdates] Initial open orders fetched:', {
          count: openOrdersResponse.length,
          orders: openOrdersResponse,
        });

        // Transform to OrderNode array (flat structure)
        const initialOrders: OrderNode[] = openOrdersResponse.map(apiOrder =>
          transformToOrderNode(apiOrder, 'open'),
        );

        if (isMounted) {
          setOrders(initialOrders);
          console.log('[useOrderUpdates] Set initial orders:', {
            count: initialOrders.length,
          });
        }

        // Step 2: Subscribe to orderUpdates WebSocket for incremental updates
        const subscriptionClient = getSubscriptionClient();
        console.log('[useOrderUpdates] Setting up WebSocket subscription...');

        const subscription = await subscriptionClient.orderUpdates(
          {
            user: address,
          },
          (orderUpdates: any[]) => {
            console.log('[useOrderUpdates] Received incremental updates:', {
              count: orderUpdates.length,
              isMounted,
              orders: orderUpdates,
            });

            if (isMounted) {
              setOrders(prevOrders => {
                // Keep the full update structure (includes status)
                const updates = orderUpdates.map(update => ({
                  order: update.order as ApiOrderResponse,
                  status: update.status as string | undefined,
                }));

                // Update orders array
                const newOrders = updateOrders(prevOrders, updates);

                console.log('[useOrderUpdates] Updated orders:', {
                  count: newOrders.length,
                  updates: orderUpdates,
                });

                return newOrders;
              });
            }
          },
        );

        console.log('[useOrderUpdates] WebSocket subscription successful');
        subscriptionRef.current = subscription;

        if (isMounted) {
          setIsLoading(false);
          console.log('[useOrderUpdates] Ready to receive updates');
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
      console.log('[useOrderUpdates] Cleaning up subscription');
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
export type { Order, OrderNode } from '../types/orders';
