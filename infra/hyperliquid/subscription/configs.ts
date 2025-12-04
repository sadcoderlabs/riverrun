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

interface WebData3Params {
  user: string;
}

// Use the SDK's WsWebData3Event type directly
type WebData3Data = hl.WsWebData3Event;

// AllMids params - optional dex for HIP-3
interface AllMidsParams {
  dex?: string; // DEX name for HIP-3 (e.g., "xyz"), undefined for validator perps
}

// AllMids data contains price information for all markets
interface AllMidsData {
  mids: Record<string, string>;
}

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

// Candle subscription params
interface CandleParams {
  coin: string;
  interval:
    | '1m'
    | '3m'
    | '5m'
    | '15m'
    | '30m'
    | '1h'
    | '2h'
    | '4h'
    | '8h'
    | '12h'
    | '1d'
    | '3d'
    | '1w'
    | '1M';
}

// Candle event data (matches SDK's WsCandleEvent)
type CandleData = hl.WsCandleEvent;

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
// Configuration: webData3
// ============================================================================

subscriptionRegistry.register<WebData3Params, WebData3Data>('webData3', {
  // Key by user address
  getKey: params => params.user,

  // WebSocket subscription for real-time position updates across ALL DEXs (including HIP-3)
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.webData3(
      {
        user: params.user,
      },
      (event: hl.WsWebData3Event) => {
        callback(event);
      },
    );
  },
});

// ============================================================================
// Configuration: allMids
// ============================================================================

subscriptionRegistry.register<AllMidsParams, AllMidsData>('allMids', {
  // Key by dex name (or 'default' for validator perps)
  getKey: params => params.dex ?? 'default',

  // WebSocket subscription for real-time price updates
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    // Only pass dex param if defined (SDK may not handle undefined well)
    const subscriptionParams = params.dex ? { dex: params.dex } : {};
    return await subscriptionClient.allMids(subscriptionParams, (event: hl.WsAllMidsEvent) => {
      // Extract mids from the event to match AllMidsData interface
      callback({ mids: event.mids });
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
  // Key by user and coin (preserve case for HIP-3 assets like "xyz:GOOGL")
  getKey: params => `${params.user}-${params.coin}`,

  // WebSocket subscription for real-time leverage and position updates
  // Note: Do NOT use toUpperCase() - HIP-3 assets require lowercase DEX prefix
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.activeAssetData(
      {
        coin: params.coin,
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
  // Key by coin (preserve case for HIP-3 assets like "xyz:GOOGL")
  getKey: params => params.coin,

  // WebSocket subscription for real-time market data
  // Note: Do NOT use toUpperCase() - HIP-3 assets require lowercase DEX prefix
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.activeAssetCtx(
      {
        coin: params.coin,
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
  // Key includes both coin and precision level (preserve case for HIP-3)
  getKey: params => `${params.coin}-${params.nSigFigs ?? 'full'}`,

  // WebSocket subscription
  // Note: Do NOT use toUpperCase() - HIP-3 assets require lowercase DEX prefix
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.l2Book(
      {
        coin: params.coin,
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
  // Key by coin (preserve case for HIP-3)
  getKey: params => params.coin,

  // WebSocket subscription for real-time trades
  // Note: Do NOT use toUpperCase() - HIP-3 assets require lowercase DEX prefix
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.trades(
      {
        coin: params.coin,
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

// ============================================================================
// Configuration: candle
// ============================================================================

subscriptionRegistry.register<CandleParams, CandleData>('candle', {
  // Key by coin and interval (preserve case for HIP-3)
  getKey: params => `${params.coin}-${params.interval}`,

  // WebSocket subscription for real-time candle updates
  // Note: Do NOT use toUpperCase() - HIP-3 assets require lowercase DEX prefix
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.candle(
      {
        coin: params.coin,
        interval: params.interval,
      },
      (candleEvent: hl.WsCandleEvent) => {
        callback(candleEvent);
      },
    );
  },
});
