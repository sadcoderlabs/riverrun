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
  /** Orders in tree structure with children */
  orderTree: OrderNode[];
  /** Flattened view of all orders (for convenience) */
  flatOrders: OrderNode[];
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
 * Transform API order response to OrderNode (with children)
 */
function transformToOrderNode(apiOrder: ApiOrderResponse, status: OrderStatus = 'open'): OrderNode {
  const order = transformApiOrder(apiOrder);

  // Process children recursively
  const children: OrderNode[] = [];
  if (apiOrder.children && apiOrder.children.length > 0) {
    apiOrder.children.forEach(childApiOrder => {
      children.push(transformToOrderNode(childApiOrder, status));
    });
  }

  return {
    order,
    status,
    statusTimestamp: apiOrder.timestamp,
    children,
  };
}

/**
 * Flatten order tree to array (depth-first traversal)
 * Uses a Set to ensure each order appears only once (by oid)
 */
export function flattenOrderTree(orderTree: OrderNode[]): OrderNode[] {
  const result: OrderNode[] = [];
  const seenOids = new Set<number>();

  function traverse(node: OrderNode) {
    // Only add if we haven't seen this oid before
    if (!seenOids.has(node.order.oid)) {
      seenOids.add(node.order.oid);
      result.push(node);
    }

    // Recursively add children
    node.children.forEach(traverse);
  }

  orderTree.forEach(traverse);
  return result;
}

/**
 * Build a Map from order tree for efficient lookups by oid
 */
function buildOrderMap(orderTree: OrderNode[]): Map<number, OrderNode> {
  const map = new Map<number, OrderNode>();

  function addToMap(node: OrderNode) {
    map.set(node.order.oid, node);
    node.children.forEach(addToMap);
  }

  orderTree.forEach(addToMap);
  return map;
}

/**
 * Update or insert order node in tree
 * Returns new tree with updates applied
 */
function updateOrderTree(
  currentTree: OrderNode[],
  updates: Array<{ order: ApiOrderResponse; status?: string }>,
): OrderNode[] {
  // Build map of current orders for efficient lookup
  const orderMap = buildOrderMap(currentTree);

  // Process each update
  updates.forEach(update => {
    const apiUpdate = update.order;
    // Use status from update if available, otherwise default to 'open'
    const status = (update.status as OrderStatus) || 'open';

    const updatedNode = transformToOrderNode(apiUpdate, status);

    // If order is canceled, remove it from the map
    if (status === 'canceled' || status === 'filled') {
      orderMap.delete(updatedNode.order.oid);
      // Also remove children
      updatedNode.children.forEach(child => {
        orderMap.delete(child.order.oid);
      });
    } else {
      // Update map
      orderMap.set(updatedNode.order.oid, updatedNode);

      // Also update children in map
      updatedNode.children.forEach(child => {
        orderMap.set(child.order.oid, child);
      });
    }
  });

  // Rebuild tree from map
  // Keep only root orders (orders that are not children of any other order)
  const allOrders = Array.from(orderMap.values());
  const childOids = new Set<number>();

  // Collect all child order IDs
  allOrders.forEach(node => {
    node.children.forEach(child => {
      childOids.add(child.order.oid);
    });
  });

  // Filter to get only root orders
  return allOrders.filter(node => !childOids.has(node.order.oid));
}

// ============================================================================
// Main Hook
// ============================================================================

export function useOrderUpdates(): UseOrderUpdatesResult {
  const { address, isAuthenticated } = useActiveWallet();
  const { getSubscriptionClient, getInfoClient } = useHyperliquidClient();
  const [orderTree, setOrderTree] = useState<OrderNode[]>([]);
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
      setOrderTree([]);
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

        // Transform to OrderNode tree structure
        const initialOrderTree: OrderNode[] = openOrdersResponse.map(apiOrder =>
          transformToOrderNode(apiOrder, 'open'),
        );

        if (isMounted) {
          setOrderTree(initialOrderTree);
          console.log('[useOrderUpdates] Set initial order tree:', {
            rootOrders: initialOrderTree.length,
            totalOrders: flattenOrderTree(initialOrderTree).length,
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
              setOrderTree(prevTree => {
                // Keep the full update structure (includes status)
                const updates = orderUpdates.map(update => ({
                  order: update.order as ApiOrderResponse,
                  status: update.status as string | undefined,
                }));

                // Update tree
                const newTree = updateOrderTree(prevTree, updates);

                console.log('[useOrderUpdates] Updated order tree:', {
                  rootOrders: newTree.length,
                  totalOrders: flattenOrderTree(newTree).length,
                  updates: orderUpdates,
                });

                return newTree;
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

  // Return tree and flattened view
  const flatOrders = flattenOrderTree(orderTree);

  return {
    orderTree,
    flatOrders,
    isLoading,
    error,
  };
}

// Re-export types for convenience
export type { Order, OrderNode } from '../types/orders';
