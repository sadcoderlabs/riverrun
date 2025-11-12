/**
 * Hyperliquid Subscription Configurations
 *
 * Registers all Hyperliquid subscription types with the subscription system.
 */

import type * as hl from '@nktkas/hyperliquid';
import { getSubscriptionClient } from '@/lib/hyperliquid/client/getter';
import { subscriptionRegistry } from './subscriptionRegistry';

// ============================================================================
// Subscription Parameter Types
// ============================================================================

interface WebData2Params {
  user: string;
}

// Use the SDK's WebData2Response type directly
type WebData2Data = hl.WebData2Response;

// AllMids has no parameters (subscribes to all markets)
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AllMidsParams {
  // No parameters needed
}

// AllMids data contains price information for all markets
type AllMidsData = hl.WsAllMidsEvent;

// ============================================================================
// Configuration: webData2
// ============================================================================

subscriptionRegistry.register<WebData2Params, WebData2Data>('webData2', {
  // Key by user address
  getKey: params => params.user,

  // WebSocket subscription for real-time position updates
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.webData2(
      {
        user: params.user,
      },
      (event: hl.WsWebData2Event) => {
        callback(event);
      },
    );
  },
});

// ============================================================================
// Configuration: allMids
// ============================================================================

subscriptionRegistry.register<AllMidsParams, AllMidsData>('allMids', {
  // Single shared subscription for all markets (no user-specific key)
  getKey: () => 'global',

  // WebSocket subscription for real-time price updates across all markets
  subscribe: async (_params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.allMids((event: hl.WsAllMidsEvent) => {
      callback(event);
    });
  },
});
