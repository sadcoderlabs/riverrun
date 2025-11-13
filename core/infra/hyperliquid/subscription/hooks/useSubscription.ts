import { useEffect, useMemo, useState } from 'react';
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

  useEffect(() => {
    let handle: SubscriptionHandle | null = null;
    let dataUpdateCount = 0;

    // Setup subscription
    const setupSubscription = async () => {
      // Skip subscription if params is undefined (wallet not ready yet)
      if (params === undefined) {
        console.log(`[useSubscription] ⏭️ Skipping ${type} - params is undefined`);
        setIsLoading(false);
        return;
      }

      console.log(`[useSubscription] 🚀 Setting up ${type} subscription`, {
        params: serializedParams.substring(0, 100),
      });

      try {
        handle = await subscriptionManager.subscribe<TData>(type, params, (newData: TData) => {
          dataUpdateCount++;
          if (dataUpdateCount <= 3 || dataUpdateCount % 10 === 0) {
            console.log(`[useSubscription] 📥 ${type} data update #${dataUpdateCount}`, {
              hasData: !!newData,
              dataType: typeof newData,
              dataKeys:
                newData && typeof newData === 'object' ? Object.keys(newData).slice(0, 5) : [],
            });
          }
          setData(newData);
          setIsLoading(false);
          setError(undefined);
        });
        console.log(`[useSubscription] ✅ ${type} subscription established`);
      } catch (err) {
        console.error(`[useSubscription] ❌ Error subscribing to ${type}:`, err);
        setError(err instanceof Error ? err : new Error('Failed to subscribe'));
        setIsLoading(false);
      }
    };

    void setupSubscription();

    // Cleanup on unmount or when dependencies change
    return () => {
      if (handle) {
        console.log(`[useSubscription] 🧹 Cleaning up ${type} subscription`);
        void subscriptionManager.unsubscribe(handle);
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
