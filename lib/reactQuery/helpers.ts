/**
 * Helper utilities for creating rate-limited queries
 *
 * These helpers make it easy to wrap API calls with rate limiting
 * while using TanStack Query for caching and deduplication.
 */

import { hyperliquidRateLimiter } from '../hyperliquid/client/RateLimiter';

/**
 * Wraps a query function with rate limiting
 *
 * Usage:
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: ['userFills', address],
 *   queryFn: createRateLimitedQuery('userFills',
 *     () => infoClient.userFills({ user: address })
 *   ),
 * });
 * ```
 *
 * @param requestName - Name for rate limiter tracking (e.g., 'userFills')
 * @param fetcher - Async function that fetches data
 * @returns Rate-limited query function compatible with TanStack Query
 */
export function createRateLimitedQuery<T>(
  requestName: string,
  fetcher: () => Promise<T>,
): () => Promise<T> {
  return () => hyperliquidRateLimiter.execute(fetcher, requestName);
}

/**
 * Type-safe query key builder
 *
 * Usage:
 * ```typescript
 * const queryKey = buildQueryKey('userFills', { user: address });
 * // Returns: ['userFills', { user: address }]
 * ```
 */
export function buildQueryKey<T extends Record<string, any>>(
  resource: string,
  params?: T,
): [string, T?] {
  return params ? [resource, params] : [resource];
}
