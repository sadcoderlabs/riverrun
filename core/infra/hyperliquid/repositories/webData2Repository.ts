/**
 * WebData2 Repository
 *
 * Encapsulates data access for WebData2 stream with HTTP + WebSocket hybrid strategy.
 * This is a reusable infrastructure component that can be used by multiple Contexts.
 *
 * Repository Pattern (DDD):
 * - Hides data source details (HTTP, WebSocket, caching)
 * - Provides a clean interface for domain layer
 * - Can be reused across Position, Account, and other contexts
 *
 * Strategy:
 * 1. HTTP fetch for immediate data (~100ms) - fast initial display
 * 2. WebSocket subscription for real-time updates (~1s) - continuous updates
 */

import type * as hl from '@nktkas/hyperliquid';

/**
 * Subscription Manager interface (minimal required methods)
 */
interface ISubscriptionManager {
  subscribe<TData>(
    type: string,
    params: any,
    callback: (data: TData) => void,
  ): Promise<{ type: string; key: string }>;
  unsubscribe(handle: { type: string; key: string }): Promise<void>;
}

/**
 * Subscription handle for managing lifecycle
 */
export interface SubscriptionHandle {
  unsubscribe: () => Promise<void>;
}

/**
 * WebData2 Repository
 *
 * Manages WebData2 data access with hybrid HTTP + WebSocket strategy
 */
export class WebData2Repository {
  constructor(
    private readonly httpClient: hl.InfoClient,
    private readonly subscriptionManager: ISubscriptionManager,
  ) {}

  /**
   * Subscribe to WebData2 data stream
   *
   * Implements hybrid strategy:
   * - Fetches initial data via HTTP for fast display
   * - Establishes WebSocket subscription for real-time updates
   * - Callback is invoked with both HTTP and WebSocket data
   *
   * @param userAddress - User address to subscribe to
   * @param callback - Called when data arrives (both HTTP and WS)
   * @returns Subscription handle for cleanup
   *
   * @example
   * ```typescript
   * const handle = await repository.subscribe('0x123...', (data) => {
   *   console.log('Position data:', data.assetPositions);
   * });
   *
   * // Later...
   * await handle.unsubscribe();
   * ```
   */
  async subscribe(
    userAddress: string,
    callback: (data: hl.WebData2Response) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch for immediate data
    // This provides fast initial display (~100ms)
    try {
      const httpData = await this.httpClient.webData2({ user: userAddress });
      callback(httpData); // Invoke callback immediately
    } catch (error) {
      // HTTP failure is not fatal - WebSocket will provide data shortly
      console.warn('[WebData2Repository] HTTP fetch failed, relying on WebSocket:', error);
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    // This provides continuous updates (~1s for initial connection)
    const handle = await this.subscriptionManager.subscribe<hl.WebData2Response>(
      'webData2',
      { user: userAddress },
      callback,
    );

    return {
      unsubscribe: async () => {
        await this.subscriptionManager.unsubscribe(handle);
      },
    };
  }
}
