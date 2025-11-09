/**
 * Hyperliquid subscription configurations
 *
 * This file registers all Hyperliquid subscription types with the subscription system.
 * Each configuration defines how to subscribe to a specific data feed.
 */

import type * as hl from '@nktkas/hyperliquid';
import { getSubscriptionClient } from '../../client/getter';
import type { NSigFigs } from '@/lib/riverrun/orderbook/orderbookPrecision';
import type { Fill } from '@/lib/riverrun/history/fills';
import { subscriptionRegistry } from '../core/SubscriptionRegistry';
import type {
  ActiveAssetCtxData,
  ActiveAssetData,
  AllMidsData,
  OrderBookData,
  UserFillsData,
  TradesData,
  Trade,
} from '../types';

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

interface ActiveAssetCtxParams {
  coin: string;
}

interface TradesParams {
  coin: string;
}

// ============================================================================
// Configuration 1: allMids
// ============================================================================

subscriptionRegistry.register<AllMidsParams, AllMidsData>('allMids', {
  // No params needed, so key is always 'global'
  getKey: () => 'global',

  // WebSocket subscription
  // HTTP fetch should be handled by TanStack Query in the consuming hook
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

  // WebSocket subscription for real-time incremental updates
  // HTTP fetch should be handled by TanStack Query in useUserFills hook
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();
    return await subscriptionClient.userFills(
      {
        user: params.user,
      },
      (data: any) => {
        // WebSocket sends { fills: Fill[], isSnapshot: boolean }
        // Only forward incremental updates (not snapshots)
        // Merging logic is handled in useUserFills hook
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

  // WebSocket subscription for real-time updates
  // HTTP fetch should be handled by TanStack Query in useWebData2 hook
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

  // WebSocket subscription for real-time updates
  // HTTP fetch should be handled by TanStack Query in useActiveAssetData hook
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
// Configuration 6: activeAssetCtx (real-time market data for a specific coin)
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
      (assetCtx: ActiveAssetCtxData) => {
        callback(assetCtx);
      },
    );
  },
});

// ============================================================================
// Configuration 7: trades (real-time trade updates for a specific coin)
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
