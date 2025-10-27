import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHyperliquidClient } from './useHyperliquidClient';

export interface OrderBookLevel {
  px: string; // Price
  sz: string; // Size
  n: number; // Number of orders
}

export interface OrderBookData {
  coin: string;
  time: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

interface UseOrderBookParams {
  coin: string;
}

interface UseOrderBookResult {
  data: OrderBookData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's l2Book WebSocket feed
 * for real-time order book data.
 */
export function useOrderBook({ coin }: UseOrderBookParams): UseOrderBookResult {
  const { getSubscriptionClient } = useHyperliquidClient();
  const [data, setData] = useState<OrderBookData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('Error unsubscribing from l2Book:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if coin is not provided
    if (!coin) {
      setIsLoading(false);
      setData(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        // Cleanup any existing subscription
        await cleanup();

        // Get subscription client from hook
        const subscriptionClient = getSubscriptionClient();

        // Subscribe to l2Book
        const subscription = await subscriptionClient.l2Book(
          {
            coin: coin.toUpperCase(),
          },
          orderBookEvent => {
            if (isMounted) {
              // Transform the event data to our interface
              const transformedData: OrderBookData = {
                coin: orderBookEvent.coin,
                time: orderBookEvent.time,
                bids: orderBookEvent.levels[0], // Index 0 = bids
                asks: orderBookEvent.levels[1], // Index 1 = asks
              };
              setData(transformedData);
              setIsLoading(false);
            }
          },
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('Error setting up l2Book subscription:', err);
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
  }, [coin, cleanup, getSubscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
