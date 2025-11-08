import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSubscriptionClient } from '../client/useSubscriptionClient';

export interface ActiveAssetCtx {
  coin: string;
  ctx: {
    markPx: string;
    funding: string;
    prevDayPx: string;
    dayNtlVlm: string;
    openInterest: string;
    midPx: string;
    oraclePx: string;
    premium: string;
    impactPxs: [string, string];
    dayBaseVlm: string;
  };
}

interface UseActiveAssetCtxParams {
  coin: string;
}

interface UseActiveAssetCtxResult {
  data: ActiveAssetCtx | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's activeAssetCtx WebSocket feed
 * for real-time market data including price, funding rate, and volume.
 */
export function useActiveAssetCtx({ coin }: UseActiveAssetCtxParams): UseActiveAssetCtxResult {
  const subscriptionClient = useSubscriptionClient();
  const [data, setData] = useState<ActiveAssetCtx | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('Error unsubscribing from activeAssetCtx:', err);
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

        // Subscribe to activeAssetCtx
        const subscription = await subscriptionClient.activeAssetCtx(
          {
            coin: coin.toUpperCase(),
          },
          assetCtx => {
            if (isMounted) {
              setData(assetCtx as ActiveAssetCtx);
              setIsLoading(false);
            }
          },
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('Error setting up activeAssetCtx subscription:', err);
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
    data,
    isLoading,
    error,
  };
}
