/**
 * Hyperliquid subscription configurations
 *
 * This file registers all Hyperliquid subscription types with the subscription system.
 * Each configuration defines how to subscribe to a specific data feed.
 */

import { getInfoClient, getSubscriptionClient } from '../../client/getter';
import { subscriptionRegistry } from '../core/SubscriptionRegistry';
import type { OrderBookData } from '../../orderbook/useOrderBook';
import type { AllMidsData } from '../../market/useAllMids';
import type { NSigFigs } from '../../orderbook/orderbookPrecision';

// ============================================================================
// Type Definitions
// ============================================================================

interface AllMidsParams {
  // No params needed for allMids
}

interface OrderBookParams {
  coin: string;
  nSigFigs?: NSigFigs;
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
// Future configurations (Phase 2)
// ============================================================================

// TODO: Add these in Phase 2 migration:
// - activeAssetData
// - webData2
// - userFills
// - orderUpdates
// - trades
// - activeAssetCtx
