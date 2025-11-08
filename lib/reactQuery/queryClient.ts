/**
 * TanStack Query Client Configuration
 *
 * Provides global configuration for HTTP query management:
 * - Request deduplication: Multiple components requesting same data share one request
 * - Intelligent caching: Reduces unnecessary API calls
 * - Stale-while-revalidate: Show cached data while fetching fresh data in background
 *
 * Rate Limiting Integration:
 * - Individual queryFn should wrap calls with rateLimiter.executeRequest()
 * - This ensures HTTP requests respect global 1200 weight/min limit
 * - Works alongside WebSocket subscriptions (managed by SubscriptionManager)
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache Configuration
      staleTime: 30000, // 30 seconds - data is fresh for 30s, won't refetch
      gcTime: 300000, // 5 minutes - cache cleanup time (previously cacheTime)

      // Network Configuration
      retry: 1, // Retry failed requests once
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Behavior Configuration
      refetchOnWindowFocus: false, // Don't refetch when window regains focus (mobile app)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts if data is stale

      // Note: Rate limiting should be handled in individual queryFn functions
      // Example:
      //   queryFn: () => rateLimiter.executeRequest('userFills',
      //     () => infoClient.userFills({ user: address })
      //   )
    },
    mutations: {
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
