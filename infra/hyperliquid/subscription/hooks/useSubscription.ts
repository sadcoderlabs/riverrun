import { useEffect, useMemo, useRef, useState } from 'react';
import { subscriptionManager } from '../subscriptionManager';
import type { SubscriptionHandle } from '../types';

/**
 * Subscription state returned by useSubscription hook
 */
export interface SubscriptionState<TData> {
  data: TData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Unified subscription hook
 *
 * Provides a simple, consistent API for subscribing to any registered data feed.
 *
 * Features:
 * - Automatic subscription management (subscribe on mount, unsubscribe on unmount)
 * - App Lifecycle integration (managed globally in _layout via pauseAll/resumeAll)
 * - Shared subscriptions (multiple components using same params share one WebSocket)
 * - Type-safe params and data
 *
 * @param type - Subscription type (must be registered in registry)
 * @param params - Parameters for the subscription (optional for some types like allMids)
 * @returns Subscription state (data, isLoading, error)
 *
 * @example
 * ```typescript
 * // Example 1: allMids (no params)
 * const { data, isLoading, error } = useSubscription('allMids');
 *
 * // Example 2: orderBook (with params)
 * const { data: orderBook } = useSubscription('orderBook', {
 *   coin: 'BTC',
 *   nSigFigs: 3,
 * });
 *
 * // Example 3: activeAssetData (user + coin)
 * const { data } = useSubscription('activeAssetData', {
 *   user: walletAddress,
 *   coin: 'ETH',
 * });
 * ```
 */
export function useSubscription<TData = any>(type: string, params?: any): SubscriptionState<TData> {
  const [data, setData] = useState<TData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Serialize params for stable comparison in useEffect
  const serializedParams = useMemo(() => JSON.stringify(params), [params]);

  // Use refs to handle race conditions with async subscribe
  const handleRef = useRef<SubscriptionHandle | undefined>(undefined);
  const isCancelledRef = useRef(false);

  // Clear data when params change to prevent showing stale data
  useEffect(() => {
    setData(undefined);
    setIsLoading(true);
    setError(undefined);
  }, [type, serializedParams]);

  useEffect(() => {
    // Reset refs for new subscription
    handleRef.current = undefined;
    isCancelledRef.current = false;

    // Skip subscription if params is undefined (wallet not ready yet)
    if (params === undefined) {
      setIsLoading(false);
      return;
    }

    // Setup subscription
    (async () => {
      try {
        const handle = await subscriptionManager.subscribe<TData>(
          type,
          params,
          (newData: TData) => {
            // Check if this subscription was cancelled while waiting
            if (!isCancelledRef.current) {
              setData(newData);
              setIsLoading(false);
              setError(undefined);
            }
          },
        );

        // Store handle in ref for cleanup
        handleRef.current = handle;

        // If cancelled while subscribing, immediately unsubscribe
        if (isCancelledRef.current) {
          await subscriptionManager.unsubscribe(handle);
        }
      } catch (err) {
        if (!isCancelledRef.current) {
          console.error(`[useSubscription] Error subscribing to ${type}:`, err);
          setError(err instanceof Error ? err : new Error('Failed to subscribe'));
          setIsLoading(false);
        }
      }
    })();

    // Cleanup on unmount or when dependencies change
    return () => {
      // Mark as cancelled immediately
      isCancelledRef.current = true;

      // Unsubscribe if handle is available
      if (handleRef.current) {
        void subscriptionManager.unsubscribe(handleRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, serializedParams]);

  return useMemo(
    () => ({
      data,
      isLoading,
      error,
    }),
    [data, isLoading, error],
  );
}
