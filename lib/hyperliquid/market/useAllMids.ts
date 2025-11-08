import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfoClient } from '../client/useInfoClient';
import { useSubscriptionClient } from '../client/useSubscriptionClient';

export interface AllMidsData {
  mids: Record<string, string>;
}

interface UseAllMidsParams {
  enabled?: boolean;
}

interface UseAllMidsResult {
  data: AllMidsData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

// Global state to prevent rapid HTTP requests (rate limiting protection)
let lastHttpFetchTime = 0;
const MIN_HTTP_FETCH_INTERVAL = 1000; // 1 second minimum between HTTP fetches

/**
 * Hook to get Hyperliquid's allMids using hybrid strategy:
 * 1. Fast initial fetch via HTTP API (100-300ms)
 * 2. Real-time updates via WebSocket subscription
 *
 * Returns a map of coin symbol to mid price string.
 * Example: { "BTC": "101898.5", "ETH": "3304.35", ... }
 *
 * @param enabled - Whether to fetch and subscribe to the feed (default: true)
 */
export function useAllMids({ enabled = true }: UseAllMidsParams = {}): UseAllMidsResult {
  const infoClient = useInfoClient();
  const subscriptionClient = useSubscriptionClient();
  const [data, setData] = useState<AllMidsData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);
  const httpFetchedRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('Error unsubscribing from allMids:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't fetch if disabled
    if (!enabled) {
      setIsLoading(false);
      setData(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);
    httpFetchedRef.current = false;

    const fetchAndSubscribe = async () => {
      // Step 1: Fast HTTP fetch for initial data (with rate limiting protection)
      const now = Date.now();
      const timeSinceLastFetch = now - lastHttpFetchTime;

      if (timeSinceLastFetch >= MIN_HTTP_FETCH_INTERVAL) {
        try {
          lastHttpFetchTime = now;
          const httpData = await infoClient.allMids();

          if (isMounted) {
            setData({ mids: httpData });
            setIsLoading(false);
            httpFetchedRef.current = true;
          }
        } catch (err) {
          console.error('[useAllMids] HTTP fetch failed:', err);
          // Don't set error state, will try WebSocket
        }
      } else {
        // Skip HTTP fetch if too soon, rely on WebSocket only
        console.log(
          `[useAllMids] Skipping HTTP fetch (${timeSinceLastFetch}ms since last fetch, min ${MIN_HTTP_FETCH_INTERVAL}ms)`,
        );
      }

      // Step 2: Set up WebSocket subscription for real-time updates
      try {
        // Cleanup any existing subscription
        await cleanup();

        // Subscribe to allMids for real-time updates
        const subscription = await subscriptionClient.allMids({}, midsData => {
          if (isMounted) {
            setData(midsData as AllMidsData);
            // If HTTP didn't return yet, WebSocket is the first result
            if (!httpFetchedRef.current) {
              setIsLoading(false);
            }
          }
        });

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('[useAllMids] WebSocket subscription failed:', err);
          // Only set error if both HTTP and WebSocket failed
          if (!httpFetchedRef.current) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
            setIsLoading(false);
          }
        }
      }
    };

    void fetchAndSubscribe();

    // Cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
      void cleanup();
    };
  }, [enabled, cleanup, infoClient, subscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
