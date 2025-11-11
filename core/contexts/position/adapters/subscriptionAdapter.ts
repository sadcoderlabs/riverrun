/**
 * Subscription Adapter
 *
 * This adapter wraps the HyperliquidSubscriptionService to implement SubscriptionPort.
 * It leverages the RefCount mechanism to share WebSocket connections across components.
 */

import type {
  HyperliquidSubscriptionService,
  SubscriptionHandle as InfraHandle,
} from '@/core/infra/hyperliquid/subscription';
import type { SubscriptionHandle, SubscriptionPort, WebData2Data } from '../ports/subscriptionPort';

/**
 * Subscription Adapter Implementation
 *
 * Bridges the position context with the unified subscription infrastructure.
 * Allows Service layer to subscribe without depending on React hooks.
 */
export class SubscriptionAdapter implements SubscriptionPort {
  constructor(private readonly subscriptionService: HyperliquidSubscriptionService) {}

  /**
   * Subscribe to WebData2 stream
   */
  async subscribeWebData2(
    userAddress: string,
    callback: (data: WebData2Data) => void,
  ): Promise<SubscriptionHandle> {
    // Use unified subscription service (with RefCount)
    const handle: InfraHandle = await this.subscriptionService.subscribe<WebData2Data>(
      'webData2',
      { user: userAddress },
      callback,
    );

    // Return wrapped handle
    return {
      unsubscribe: async () => {
        await this.subscriptionService.unsubscribe(handle);
      },
    };
  }
}
