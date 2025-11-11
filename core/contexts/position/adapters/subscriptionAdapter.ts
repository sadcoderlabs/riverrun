/**
 * Subscription Adapter
 *
 * This adapter wraps the existing SubscriptionManager to implement SubscriptionPort.
 * It leverages the RefCount mechanism to share WebSocket connections across components.
 */

import { subscriptionManager } from '@/lib/hyperliquid/subscription';
import type { SubscriptionHandle as ManagerHandle } from '@/lib/hyperliquid/subscription/core/types';
import type { SubscriptionHandle, SubscriptionPort, WebData2Data } from '../ports/subscriptionPort';

/**
 * Subscription Adapter Implementation
 *
 * Bridges the position context with the existing subscription system.
 * Allows Service layer to subscribe without depending on React hooks.
 */
export class SubscriptionAdapter implements SubscriptionPort {
  /**
   * Subscribe to WebData2 stream
   */
  async subscribeWebData2(
    userAddress: string,
    callback: (data: WebData2Data) => void,
  ): Promise<SubscriptionHandle> {
    // Use existing subscriptionManager (with RefCount)
    const handle: ManagerHandle = await subscriptionManager.subscribe<WebData2Data>(
      'webData2',
      { user: userAddress },
      callback,
    );

    // Return wrapped handle
    return {
      unsubscribe: async () => {
        await subscriptionManager.unsubscribe(handle);
      },
    };
  }
}
