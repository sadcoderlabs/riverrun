/**
 * Hyperliquid subscription configurations
 *
 * This file registers all Hyperliquid subscription types with the subscription system.
 * Each configuration defines how to subscribe to a specific data feed.
 */

import { getSubscriptionClient } from '../../client/getter';
import { subscriptionRegistry } from '../core/SubscriptionRegistry';
import type { NSigFigs } from '../../orderbook/orderbookPrecision';
import type { Fill } from '../../types/fills';
import type * as hl from '@nktkas/hyperliquid';
import type {
  AllMidsData,
  OrderBookData,
  UserFillsData,
  ActiveAssetData,
  ActiveAssetCtxData,
} from '../types';
import type { Order, ApiOrderResponse } from '../../types/orders';

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
// Configuration 6: orderUpdates
// ============================================================================

interface OrderUpdatesParams {
  user: string;
}

interface OrderUpdatesData {
  orders: Order[];
}

// Helper function to transform API order to typed Order
function transformApiOrder(apiOrder: ApiOrderResponse): Order {
  const isTrigger =
    apiOrder.isTrigger === true ||
    (apiOrder.triggerPx && apiOrder.triggerPx !== '0.0' && apiOrder.triggerPx !== '0');

  // Infer order type
  let orderType = apiOrder.orderType;
  if (!orderType) {
    if (isTrigger) {
      orderType =
        apiOrder.limitPx === '0' || apiOrder.limitPx === '0.0' ? 'Stop Market' : 'Stop Limit';
    } else if (apiOrder.tif === 'FrontendMarket' || apiOrder.tif === 'LiquidationMarket') {
      orderType = 'Market';
    } else {
      orderType = 'Limit';
    }
  }

  if (isTrigger) {
    return {
      coin: apiOrder.coin,
      side: apiOrder.side,
      limitPx: apiOrder.limitPx,
      sz: apiOrder.sz,
      oid: apiOrder.oid,
      timestamp: apiOrder.timestamp,
      origSz: apiOrder.origSz,
      cloid: apiOrder.cloid ?? undefined,
      reduceOnly: apiOrder.reduceOnly ?? false,
      orderType: orderType as any,
      tif: apiOrder.tif ?? null,
      isTrigger: true,
      triggerPx: apiOrder.triggerPx || '0.0',
      triggerCondition: apiOrder.triggerCondition || 'N/A',
    };
  } else {
    return {
      coin: apiOrder.coin,
      side: apiOrder.side,
      limitPx: apiOrder.limitPx,
      sz: apiOrder.sz,
      oid: apiOrder.oid,
      timestamp: apiOrder.timestamp,
      origSz: apiOrder.origSz,
      cloid: apiOrder.cloid ?? undefined,
      reduceOnly: apiOrder.reduceOnly ?? false,
      orderType: orderType as any,
      tif: apiOrder.tif ?? null,
      triggerPx: apiOrder.triggerPx,
      triggerCondition: apiOrder.triggerCondition,
    };
  }
}

subscriptionRegistry.register<OrderUpdatesParams, OrderUpdatesData>('orderUpdates', {
  // Key by user address
  getKey: params => params.user,

  // WebSocket subscription for incremental order updates
  // HTTP fetch for initial orders should be handled by TanStack Query in consuming hook
  subscribe: async (params, callback) => {
    const subscriptionClient = getSubscriptionClient();

    // Subscribe to order updates
    const subscription = await subscriptionClient.orderUpdates(
      {
        user: params.user,
      },
      async (orderUpdates: any[]) => {
        // Log everything we receive from WebSocket
        console.log(
          `[orderUpdates] WebSocket received ${orderUpdates.length} updates:`,
          JSON.stringify(orderUpdates, null, 2),
        );

        // For now, just log and don't process
        // This will help us understand what triggers 429 errors
      },
    );

    return subscription;
  },
});

// ============================================================================
// Configuration 7: metaAndAssetCtxs (for all asset contexts including markPx)
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface MetaAndAssetCtxsParams {
  // No params needed
}

interface MetaAndAssetCtxsData {
  metaAndAssetCtxs: hl.MetaAndAssetCtxsResponse;
}

subscriptionRegistry.register<MetaAndAssetCtxsParams, MetaAndAssetCtxsData>('metaAndAssetCtxs', {
  // Global key since this fetches all assets
  getKey: () => 'global',

  // No WebSocket subscription for this endpoint - HTTP only
  // HTTP fetch should be handled by TanStack Query in consuming hook
  // This is a dummy subscription that does nothing
  subscribe: async (_params, _callback) => {
    const dummySignal = new AbortController();
    return {
      unsubscribe: async () => {
        dummySignal.abort();
      },
      resubscribeSignal: dummySignal.signal,
    };
  },
});

// ============================================================================
// Configuration 8: activeAssetCtx (real-time market data for a specific coin)
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
// Future configurations (Phase 2 - remaining)
// ============================================================================

// TODO: Add these in Phase 2 migration:
// - trades
