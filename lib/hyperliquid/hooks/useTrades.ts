/**
 * Hook to subscribe to Hyperliquid's trades WebSocket feed
 * for real-time trade updates.
 *
 * Provides a list of recent trades (up to last 10).
 * Use with useLatestPrice to derive latest price and direction.
 */

import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getSubscriptionClient } from '../client/getter';

export interface Trade {
  coin: string;
  side: 'B' | 'A'; // "B" = Bid/Buy, "A" = Ask/Sell
  px: string; // Price
  sz: string; // Size
  time: number; // Timestamp in ms
  hash: string;
  tid: number;
  users: [string, string]; // [Maker, Taker]
}

interface UseTradesParams {
  coin: string;
}

interface UseTradesResult {
  /** All recent trades (up to last 10) */
  trades: Trade[];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to trades WebSocket feed
 *
 * @example
 * ```typescript
 * const { trades, isLoading } = useTrades({ coin: 'BTC' });
 * ```
 */
export function useTrades({ coin }: UseTradesParams): UseTradesResult {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('[useTrades] Error unsubscribing:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if coin is not provided
    if (!coin) {
      setIsLoading(false);
      setTrades([]);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        // Cleanup any existing subscription
        await cleanup();

        const subscriptionClient = getSubscriptionClient();

        // Subscribe to trades
        const subscription = await subscriptionClient.trades(
          {
            coin: coin.toUpperCase(),
          },
          (tradesData: Trade[]) => {
            if (isMounted && tradesData.length > 0) {
              // Update trades list, keeping last 10
              setTrades(prevTrades => {
                const newTrades = [...prevTrades, ...tradesData].slice(-10);
                return newTrades;
              });

              setIsLoading(false);
            }
          },
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('[useTrades] Error setting up subscription:', err);
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
  }, [coin, cleanup]);

  return {
    trades,
    isLoading,
    error,
  };
}
