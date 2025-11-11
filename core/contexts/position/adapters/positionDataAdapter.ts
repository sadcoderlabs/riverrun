/**
 * Position Data Adapter
 *
 * Adapts WebData2Repository to PositionDataPort interface.
 * This is a true Adapter in DDD terms - it simply adapts one interface to another.
 *
 * The Repository handles:
 * - HTTP + WebSocket hybrid strategy
 * - Data source coordination
 * - Error handling
 *
 * The Adapter handles:
 * - Interface adaptation (Repository → Port)
 * - Type conversion if needed
 */

import type { WebData2Repository } from '@/core/infra/hyperliquid/repositories';
import type { PositionData, PositionDataPort, SubscriptionHandle } from '../ports/positionDataPort';

/**
 * Position Data Adapter
 *
 * Adapts WebData2Repository to implement PositionDataPort
 */
export class PositionDataAdapter implements PositionDataPort {
  constructor(private readonly repository: WebData2Repository) {}

  /**
   * Subscribe to position data
   *
   * Delegates to Repository which handles HTTP + WebSocket hybrid strategy
   *
   * @param userAddress - User address to subscribe to
   * @param callback - Called when position data updates
   * @returns Subscription handle for cleanup
   */
  async subscribe(
    userAddress: string,
    callback: (data: PositionData) => void,
  ): Promise<SubscriptionHandle> {
    // Simply delegate to repository
    // Repository handles all the complexity (HTTP + WS hybrid, error handling, etc.)
    return this.repository.subscribe(userAddress, callback);
  }
}
