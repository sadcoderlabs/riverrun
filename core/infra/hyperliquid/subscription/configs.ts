/**
 * Hyperliquid Subscription Configurations
 *
 * Registers all Hyperliquid subscription types with the subscription system.
 */

import type * as hl from '@nktkas/hyperliquid';
import { getSubscriptionClient } from '../client/getter';
import { subscriptionRegistry } from './subscriptionRegistry';
import type {
  NSigFigs,
  OrderBookData,
  ActiveAssetData,
  ActiveAssetCtxData,
  TradesData,
  Trade,
  OrderUpdatesData,
  OrderUpdate,
} from './types/subscriptionData';

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

interface ActiveAssetCtxParams {
  coin: string;
}

interface OrderBookParams {
  coin: string;
  nSigFigs?: NSigFigs;
}

interface TradesParams {
  coin: string;
}

interface OrderUpdatesParams {
  user: string;
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
      (assetData: any) => {
        callback(assetData);
      },
    );
  },
});

// ============================================================================
// Configuration: activeAssetCtx
// ============================================================================

subscriptionRegistry.register<ActiveAssetCtxParams, ActiveAssetCtxData>('activeAssetCtx', {
  // Key by coin
  getKey: params => params.coin.toUpperCase(),

  // WebSocket subscription for real-time market data
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.activeAssetCtx(
      {
        coin: params.coin.toUpperCase(),
      },
      (assetCtx: any) => {
        callback(assetCtx);
      },
    );
  },
});

// ============================================================================
// Configuration: orderBook
// ============================================================================

subscriptionRegistry.register<OrderBookParams, OrderBookData>('orderBook', {
  // Key includes both coin and precision level
  getKey: params => `${params.coin}-${params.nSigFigs ?? 'full'}`,

  // WebSocket subscription
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.l2Book(
      {
        coin: params.coin.toUpperCase(),
        nSigFigs: params.nSigFigs ?? undefined,
      },
      (orderBookEvent: any) => {
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
// Configuration: trades
// ============================================================================

subscriptionRegistry.register<TradesParams, TradesData>('trades', {
  // Key by coin
  getKey: params => params.coin.toUpperCase(),

  // WebSocket subscription for real-time trades
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.trades(
      {
        coin: params.coin.toUpperCase(),
      },
      (trades: Trade[]) => {
        // Forward trades array to callback
        callback({ trades });
      },
    );
  },
});

// ============================================================================
// Configuration: orderUpdates
// ============================================================================

subscriptionRegistry.register<OrderUpdatesParams, OrderUpdatesData>('orderUpdates', {
  // Key by user address
  getKey: params => params.user,

  // WebSocket subscription for real-time order updates
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.orderUpdates(
      {
        user: params.user,
      },
      (updates: OrderUpdate[]) => {
        // Forward updates array to callback
        callback({ updates });
      },
    );
  },
});
