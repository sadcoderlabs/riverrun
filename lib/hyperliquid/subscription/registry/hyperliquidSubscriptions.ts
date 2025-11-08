/**
 * Hyperliquid subscription configurations
 *
 * This file registers all Hyperliquid subscription types with the subscription system.
 * Each configuration defines how to subscribe to a specific data feed.
 */

import { getInfoClient, getSubscriptionClient } from '../../client/getter';
import { subscriptionRegistry } from '../core/SubscriptionRegistry';
import type { NSigFigs } from '../../orderbook/orderbookPrecision';
import type { Fill } from '../../types/fills';
import type * as hl from '@nktkas/hyperliquid';
import type { AllMidsData, OrderBookData, UserFillsData, ActiveAssetData } from '../types';

// ============================================================================
// Subscription Parameter Types
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface AllMidsParams {
  // No params needed for allMids
}

interface OrderBookParams {
  coin: string;
  nSigFigs?: NSigFigs;
}

interface UserFillsParams {
  user: string;
}

interface WebData2Params {
  user: string;
}

// Use the SDK's WebData2Response type directly
type WebData2Data = hl.WebData2Response;

interface ActiveAssetDataParams {
  user: string;
  coin: string;
}

// ============================================================================
// Configuration 1: allMids
// ============================================================================

subscriptionRegistry.register<AllMidsParams, AllMidsData>('allMids', {
  // No params needed, so key is always 'global'
  getKey: () => 'global',

  // HTTP fetch for initial data
  httpFetch: async () => {
    const infoClient = getInfoClient();
    const mids = await infoClient.allMids();
    return { mids };
  },

  // WebSocket subscription
  subscribe: async (_params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.allMids({}, data => {
      // SDK returns { mids: Record<string, string>, dex?: string }
      // We just pass through the mids field
      callback({ mids: data.mids });
    });
  },
});

// ============================================================================
// Configuration 2: orderBook (l2Book)
// ============================================================================

subscriptionRegistry.register<OrderBookParams, OrderBookData>('orderBook', {
  // Key includes both coin and precision level
  getKey: params => `${params.coin}-${params.nSigFigs ?? 'full'}`,

  // No HTTP fetch for orderBook - pure WebSocket
  // (could add infoClient.l2Book() in the future if needed)

  // WebSocket subscription
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.l2Book(
      {
        coin: params.coin.toUpperCase(),
        nSigFigs: params.nSigFigs ?? undefined,
      },
      orderBookEvent => {
        // Transform the event data to our interface
        const transformedData: OrderBookData = {
          coin: orderBookEvent.coin,
          time: orderBookEvent.time,
          bids: orderBookEvent.levels[0], // Index 0 = bids
          asks: orderBookEvent.levels[1], // Index 1 = asks
        };
        callback(transformedData);
      },
    );
  },
});

// ============================================================================
// Configuration 3: userFills
// ============================================================================

subscriptionRegistry.register<UserFillsParams, UserFillsData>('userFills', {
  // Key by user address
  getKey: params => params.user,

  // HTTP fetch for initial fills (max 2000 most recent)
  httpFetch: async params => {
    const infoClient = getInfoClient();
    const fills = (await infoClient.userFills({
      user: params.user,
    })) as Fill[];

    // Sort by time (most recent first)
    return {
      fills: fills.sort((a, b) => b.time - a.time),
    };
  },

  // WebSocket subscription for real-time updates
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.userFills(
      {
        user: params.user,
      },
      (data: any) => {
        // WebSocket sends { fills: Fill[], isSnapshot: boolean }
        // For real-time updates (isSnapshot: false), we need to merge with existing
        // For now, just pass through - merging will be handled in the hook
        if (data.fills && data.fills.length > 0 && !data.isSnapshot) {
          callback({ fills: data.fills as Fill[] });
        }
      },
    );
  },
});

// ============================================================================
// Configuration 4: webData2
// ============================================================================

subscriptionRegistry.register<WebData2Params, WebData2Data>('webData2', {
  // Key by user address
  getKey: params => params.user,

  // HTTP fetch for initial data
  httpFetch: async params => {
    const infoClient = getInfoClient();
    return await infoClient.webData2({ user: params.user });
  },

  // WebSocket subscription for real-time updates
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
// Configuration 5: activeAssetData
// ============================================================================

subscriptionRegistry.register<ActiveAssetDataParams, ActiveAssetData>('activeAssetData', {
  // Key by user and coin
  getKey: params => `${params.user}-${params.coin}`,

  // HTTP fetch for initial data
  httpFetch: async params => {
    const infoClient = getInfoClient();
    return await infoClient.activeAssetData({
      coin: params.coin.toUpperCase(),
      user: params.user,
    });
  },

  // WebSocket subscription for real-time updates
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

// ============================================================================
// Future configurations (Phase 2 - remaining)
// ============================================================================

// TODO: Add these in Phase 2 migration:
// - orderUpdates
// - trades
// - activeAssetCtx
