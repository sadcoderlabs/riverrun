/**
 * Hyperliquid Subscription Service
 *
 * Unified subscription service for the Hyperliquid WebSocket system.
 * This is the main entry point for Domain Layer to access subscription functionality.
 *
 * Features:
 * - Type-safe subscription API
 * - RefCount mechanism (multiple subscribers share one connection)
 * - App Lifecycle support (pause/resume)
 * - No React dependencies
 */

import { subscriptionManager } from './subscriptionManager';
import type { SubscriptionHandle } from './types';

/**
 * Hyperliquid Subscription Service
 *
 * Provides a clean, type-safe API for subscribing to Hyperliquid data streams.
 * All subscriptions automatically benefit from RefCount mechanism.
 */
export class HyperliquidSubscriptionService {
  /**
   * Subscribe to a data stream
   *
   * Multiple subscribers to the same data stream (same type + params) will share
   * a single WebSocket connection thanks to RefCount mechanism.
   *
   * @param type - Subscription type (e.g., 'webData2', 'orderUpdates')
   * @param params - Subscription parameters (e.g., { user: '0x123...' })
   * @param callback - Called when new data arrives
   * @returns Subscription handle for unsubscribing
   *
   * @example
   * ```typescript
   * const handle = await service.subscribe('webData2', { user: address }, (data) => {
   *   console.log('Position data:', data);
   * });
   *
   * // Later...
   * await handle.unsubscribe();
   * ```
   */
  async subscribe<TData = any>(
    type: string,
    params: any,
    callback: (data: TData) => void,
  ): Promise<SubscriptionHandle> {
    return subscriptionManager.subscribe<TData>(type, params, callback);
  }

  /**
   * Unsubscribe from a data stream
   *
   * Decrements RefCount. When RefCount reaches 0, the WebSocket connection is closed.
   *
   * @param handle - Handle returned by subscribe()
   */
  async unsubscribe(handle: SubscriptionHandle): Promise<void> {
    return subscriptionManager.unsubscribe(handle);
  }

  /**
   * Pause all active subscriptions
   *
   * Call this when the app goes to background.
   * Closes all WebSocket connections but keeps state and refCounts.
   */
  async pauseAll(): Promise<void> {
    return subscriptionManager.pauseAll();
  }

  /**
   * Resume all paused subscriptions
   *
   * Call this when the app comes to foreground.
   * Reopens WebSocket connections for all paused subscriptions.
   */
  async resumeAll(): Promise<void> {
    return subscriptionManager.resumeAll();
  }
}

/**
 * Singleton instance of HyperliquidSubscriptionService
 *
 * Use this instance throughout your application to ensure RefCount mechanism works correctly.
 */
export const hyperliquidSubscriptionService = new HyperliquidSubscriptionService();
