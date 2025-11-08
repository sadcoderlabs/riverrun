import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHyperliquidClient } from '../client/useHyperliquidClient';

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

/**
 * Hook to subscribe to Hyperliquid's allMids WebSocket feed
 * for real-time mid prices across all perpetual markets.
 *
 * Returns a map of coin symbol to mid price string.
 * Example: { "BTC": "101898.5", "ETH": "3304.35", ... }
 *
 * @param enabled - Whether to subscribe to the feed (default: true)
 */
export function useAllMids({ enabled = true }: UseAllMidsParams = {}): UseAllMidsResult {
  const { subscriptionClient } = useHyperliquidClient();
  const [data, setData] = useState<AllMidsData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

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
    // Don't subscribe if disabled
    if (!enabled) {
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

        // Get subscription client
        

        // Subscribe to allMids
        const subscription = await subscriptionClient.allMids({}, midsData => {
          if (isMounted) {
            setData(midsData as AllMidsData);
            setIsLoading(false);
          }
        });

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('Error setting up allMids subscription:', err);
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
  }, [enabled, cleanup, subscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
