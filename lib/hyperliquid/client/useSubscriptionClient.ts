import * as hl from '@nktkas/hyperliquid';
import { useMemo } from 'react';

import { getSubscriptionClient } from '@/lib/hyperliquid/client/getter';

/**
 * Hook for accessing Hyperliquid SubscriptionClient
 *
 * Returns a singleton SubscriptionClient instance for subscribing to
 * real-time WebSocket data from the Hyperliquid API.
 *
 * @returns SubscriptionClient instance
 *
 * @example
 * ```tsx
 * const subscriptionClient = useSubscriptionClient();
 * const subscription = await subscriptionClient.subscribeToAllMids((data) => {
 *   console.log('Market data:', data);
 * });
 * ```
 */
export function useSubscriptionClient(): hl.SubscriptionClient {
  return useMemo(() => getSubscriptionClient(), []);
}
