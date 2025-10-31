import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHyperliquidClient } from './useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

export interface OrderUpdate {
  order: {
    coin: string;
    side: 'B' | 'A';
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    origSz: string;
    cloid?: `0x${string}`;
    reduceOnly?: true;
  };
  status: string;
  statusTimestamp: number;
}

interface UseOrderUpdatesResult {
  orders: OrderUpdate[];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to manage user's order updates using a hybrid approach:
 * 1. Fetches initial open orders using InfoClient on mount
 * 2. Subscribes to orderUpdates WebSocket for real-time incremental updates
 */
export function useOrderUpdates(): UseOrderUpdatesResult {
  const { address, isAuthenticated } = useActiveWallet();
  const { getSubscriptionClient, getInfoClient } = useHyperliquidClient();
  const [orders, setOrders] = useState<OrderUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('Error unsubscribing from orderUpdates:', err);
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

        const openOrdersResponse = await infoClient.openOrders({ user: address });
        console.log('[useOrderUpdates] Initial open orders fetched:', {
          count: openOrdersResponse.length,
          orders: openOrdersResponse,
        });

        // Convert to OrderUpdate format
        const initialOrders: OrderUpdate[] = openOrdersResponse.map(order => ({
          order: {
            coin: order.coin,
            side: order.side,
            limitPx: order.limitPx,
            sz: order.sz,
            oid: order.oid,
            timestamp: order.timestamp,
            origSz: order.origSz,
            cloid: order.cloid,
            reduceOnly: order.reduceOnly,
          },
          status: 'open',
          statusTimestamp: order.timestamp,
        }));

        if (isMounted) {
          setOrders(initialOrders);
          console.log('[useOrderUpdates] Set initial orders:', initialOrders.length);
        }

        // Step 2: Subscribe to orderUpdates WebSocket for incremental updates
        const subscriptionClient = getSubscriptionClient();
        console.log('[useOrderUpdates] Setting up WebSocket subscription...');

        const subscription = await subscriptionClient.orderUpdates(
          {
            user: address,
          },
          (orderUpdates: OrderUpdate[]) => {
            console.log('[useOrderUpdates] Received incremental updates:', {
              count: orderUpdates.length,
              isMounted,
              orders: orderUpdates,
            });

            if (isMounted) {
              setOrders(prevOrders => {
                // Merge incremental updates with existing orders
                const updatedOrders = [...prevOrders];

                orderUpdates.forEach(update => {
                  const existingIndex = updatedOrders.findIndex(
                    o => o.order.oid === update.order.oid,
                  );

                  if (existingIndex !== -1) {
                    // Update existing order
                    updatedOrders[existingIndex] = update;
                  } else {
                    // Add new order
                    updatedOrders.push(update);
                  }
                });

                console.log('[useOrderUpdates] Updated orders list:', {
                  count: updatedOrders.length,
                  orders: updatedOrders,
                });

                return updatedOrders;
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
