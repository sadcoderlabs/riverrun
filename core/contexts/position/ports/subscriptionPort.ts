/**
 * Subscription Port - Abstract subscription interface
 *
 * This port abstracts the WebSocket subscription system,
 * allowing the Service layer to remain independent of the specific implementation.
 */

import type * as hl from '@nktkas/hyperliquid';

/**
 * WebData2 response type from Hyperliquid
 */
export type WebData2Data = hl.WebData2Response;

/**
 * Subscription handle for managing subscription lifecycle
 */
export interface SubscriptionHandle {
  /** Unsubscribe from the data stream */
  unsubscribe: () => Promise<void>;
}

/**
 * Subscription Port Interface
 *
 * Provides abstraction for subscribing to real-time data streams.
 */
export interface SubscriptionPort {
  /**
   * Subscribe to WebData2 stream for a user
   *
   * @param userAddress - User address to subscribe to
   * @param callback - Callback function called when data updates
   * @returns Subscription handle for managing lifecycle
   */
  subscribeWebData2(
    userAddress: string,
    callback: (data: WebData2Data) => void,
  ): Promise<SubscriptionHandle>;
}
