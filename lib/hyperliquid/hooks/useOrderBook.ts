import * as hl from '@nktkas/hyperliquid';
import { type NSigFigs } from '@/lib/hyperliquid/orderbookPrecision';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStateSubscriptionManager } from './useAppStateSubscriptionManager';
import { useHyperliquidClient } from '../client/useHyperliquidClient';

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
  /**
   * Number of significant figures for price aggregation
   * - null: Full precision (finest possible under exchange rules)
   * - 2-5: Round prices to N significant figures
   *
   * When this changes, the hook will unsubscribe and resubscribe
   * to get order book data at the new precision level.
   */
  nSigFigs?: NSigFigs;
}

interface UseOrderBookResult {
  data: OrderBookData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's l2Book WebSocket feed
 * for real-time order book data with configurable precision.
 *
 * The precision can be dynamically changed by updating the nSigFigs parameter.
 * The hook will automatically unsubscribe from the old precision and subscribe
 * to the new one.
 *
 * Features:
 * - AppState lifecycle management (pauses in background)
 * - Automatic cleanup and resubscription
 */
export function useOrderBook({ coin, nSigFigs }: UseOrderBookParams): UseOrderBookResult {
  const { subscriptionClient } = useHyperliquidClient();
  const subscriptionState = useAppStateSubscriptionManager();
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

    // Don't subscribe if app is suspended
    if (subscriptionState === 'suspended') {
      void cleanup();
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      // Only subscribe when app is active
      if (subscriptionState !== 'active') {
        return;
      }

      try {
        // Cleanup any existing subscription
        await cleanup();

        // Get subscription client
        

        // Subscribe to l2Book with precision parameter
        // nSigFigs controls price aggregation level:
        // - undefined/null: Full precision
        // - 2-5: Round to N significant figures
        const subscription = await subscriptionClient.l2Book(
          {
            coin: coin.toUpperCase(),
            nSigFigs: nSigFigs ?? undefined,
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
    // When nSigFigs changes, this will trigger unsubscribe + resubscribe
    // to get order book data at the new precision level
    return () => {
      isMounted = false;
      void cleanup();
    };
  }, [coin, nSigFigs, subscriptionState, cleanup, subscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
