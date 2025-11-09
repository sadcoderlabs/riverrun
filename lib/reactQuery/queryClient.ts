/**
 * TanStack Query Client Configuration
 *
 * Provides global configuration for HTTP query management:
 * - Request deduplication: Multiple components requesting same data share one request
 * - Short cache (1s): Avoids duplicate requests while maintaining near real-time updates
 * - Stale-while-revalidate: Show cached data while fetching fresh data in background
 *
 * Rate Limiting Integration:
 * - All API calls go through infoClient wrapper with automatic rate limiting
 * - Respects global 1200 weight/min limit
 * - Works alongside WebSocket subscriptions for real-time data
 */

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache Configuration
      staleTime: 1000, // 1 second - balance between real-time updates and avoiding duplicate requests
      gcTime: 300000, // 5 minutes - cache cleanup time (previously cacheTime)

      // Network Configuration
      retry: 1, // Retry failed requests once
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),

      // Behavior Configuration
      refetchOnWindowFocus: false, // Don't refetch when window regains focus (mobile app)
      refetchOnReconnect: true, // Refetch when network reconnects
      refetchOnMount: true, // Refetch when component mounts if data is stale

      // Note: Rate limiting is handled automatically by infoClient wrapper
      // Example:
      //   queryFn: () => infoClient.userFills({ user: address })
      //
      // For static data that changes rarely, override staleTime:
      //   staleTime: 60000  // Cache market metadata for 1 minute
    },
    mutations: {
      retry: 1,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});
