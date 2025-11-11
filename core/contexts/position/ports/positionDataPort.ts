/**
 * Position Data Port
 *
 * Domain abstraction for accessing position data.
 * This port hides all infrastructure details (HTTP, WebSocket, caching, etc.)
 * and provides a clean interface for the Position Service.
 *
 * The implementation (Adapter) will use Repository to access data.
 */

import type * as hl from '@nktkas/hyperliquid';

/**
 * Position data response type
 */
export type PositionData = hl.WebData2Response;

/**
 * Subscription handle for managing lifecycle
 */
export interface SubscriptionHandle {
  unsubscribe: () => Promise<void>;
}

/**
 * Position Data Port
 *
 * Provides abstraction for accessing position data.
 * Domain layer depends on this abstraction, not on concrete implementations.
 */
export interface PositionDataPort {
  /**
   * Subscribe to position data for a user
   *
   * The implementation handles:
   * - Data source selection (HTTP, WebSocket, cache)
   * - Initial data loading strategy
   * - Real-time updates
   * - Error handling
   *
   * @param userAddress - User address to get position data for
   * @param callback - Called when position data updates
   * @returns Handle for unsubscribing
   */
  subscribe(
    userAddress: string,
    callback: (data: PositionData) => void,
  ): Promise<SubscriptionHandle>;
}
