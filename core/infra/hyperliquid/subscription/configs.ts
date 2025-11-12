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

// UserFills subscription params
interface UserFillsParams {
  user: string;
}

// UserFills data contains fill updates
type UserFillsData = hl.WsUserFillsEvent;

// ActiveAssetData subscription params
interface ActiveAssetDataParams {
  user: string;
  coin: string;
}

// ActiveAssetData contains leverage and position info for a specific asset
interface ActiveAssetData {
  user: string;
  coin: string;
  leverage: {
    type: 'isolated' | 'cross';
    value: number;
    rawUsd?: string;
  };
  maxTradeSzs: [string, string];
  availableToTrade: [string, string];
  markPx: string;
}

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

// ============================================================================
// Configuration: userFills
// ============================================================================

subscriptionRegistry.register<UserFillsParams, UserFillsData>('userFills', {
  // Key by user address
  getKey: params => params.user,

  // WebSocket subscription for real-time fill updates
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.userFills(
      {
        user: params.user,
      },
      (event: hl.WsUserFillsEvent) => {
        callback(event);
      },
    );
  },
});

// ============================================================================
// Configuration: activeAssetData
// ============================================================================

subscriptionRegistry.register<ActiveAssetDataParams, ActiveAssetData>('activeAssetData', {
  // Key by user and coin
  getKey: params => `${params.user}-${params.coin}`,

  // WebSocket subscription for real-time leverage and position updates
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.activeAssetData(
      {
        coin: params.coin.toUpperCase(),
        user: params.user,
      },
      (assetData: ActiveAssetData) => {
        callback(assetData);
      },
    );
  },
});
