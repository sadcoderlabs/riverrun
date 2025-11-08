import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSubscriptionClient } from '../client/useSubscriptionClient';

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

interface UseRecentTradesParams {
  coin: string;
}

interface UseRecentTradesResult {
  /** Most recent trade for the coin */
  lastTrade: Trade | undefined;
  /** All recent trades (up to last 10) */
  trades: Trade[];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's trades WebSocket feed
 * for real-time trade updates.
 *
 * Provides the most recent trade and maintains a list of recent trades.
 */
export function useRecentTrades({ coin }: UseRecentTradesParams): UseRecentTradesResult {
  const subscriptionClient = useSubscriptionClient();
  const [lastTrade, setLastTrade] = useState<Trade | undefined>(undefined);
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
        console.error('Error unsubscribing from trades:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if coin is not provided
    if (!coin) {
      setIsLoading(false);
      setLastTrade(undefined);
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

        // Subscribe to trades
        const subscription = await subscriptionClient.trades(
          {
            coin: coin.toUpperCase(),
          },
          (tradesData: Trade[]) => {
            if (isMounted && tradesData.length > 0) {
              // Get the most recent trade (last in array)
              const mostRecent = tradesData[tradesData.length - 1];
              setLastTrade(mostRecent);

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
          console.error('Error setting up trades subscription:', err);
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
  }, [coin, cleanup, subscriptionClient]);

  return {
    lastTrade,
    trades,
    isLoading,
    error,
  };
}
