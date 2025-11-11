/**
 * Position Data Adapter
 *
 * Implements HTTP + WebSocket hybrid strategy for position data:
 * 1. Initial fetch via HTTP for fast display (~100ms)
 * 2. Establish WebSocket subscription for real-time updates (~1s)
 *
 * This provides better UX by showing data immediately while maintaining
 * real-time updates through WebSocket.
 */

import type * as hl from '@nktkas/hyperliquid';
import type { SubscriptionHandle, SubscriptionPort, WebData2Data } from '../ports/subscriptionPort';

/**
 * Position Data Adapter
 *
 * Coordinates HTTP fetch and WebSocket subscription for position data
 */
export class PositionDataAdapter {
  constructor(
    private readonly httpClient: hl.InfoClient,
    private readonly subscriptionPort: SubscriptionPort,
  ) {}

  /**
   * Start position data subscription with HTTP + WebSocket hybrid strategy
   *
   * Flow:
   * 1. Fetch initial data via HTTP API (fast, ~100ms)
   * 2. Invoke callback immediately with HTTP data
   * 3. Establish WebSocket subscription for real-time updates
   * 4. Future updates come through WebSocket
   *
   * @param userAddress - User address to subscribe to
   * @param callback - Callback invoked with position data (both HTTP and WS)
   * @returns Subscription handle for cleanup
   */
  async startSubscription(
    userAddress: string,
    callback: (data: WebData2Data) => void,
  ): Promise<SubscriptionHandle> {
    // Step 1: HTTP fetch for immediate data
    try {
      const httpData = await this.httpClient.webData2({ user: userAddress });
      // Immediately show data to user (~100ms)
      callback(httpData);
    } catch (error) {
      console.warn('[PositionDataAdapter] HTTP fetch failed, will rely on WebSocket:', error);
      // Not fatal - WebSocket will provide data shortly
    }

    // Step 2: Establish WebSocket subscription for real-time updates
    const handle = await this.subscriptionPort.subscribeWebData2(userAddress, callback);

    return handle;
  }
}
