/**
 * Hyperliquid Market Adapter
 *
 * Adapts Hyperliquid API and WebSocket subscription for market data.
 * Handles both HTTP fetch (meta/assetCtxs) and WebSocket (allMids).
 */

import * as infoClient from '@/lib/hyperliquid/client/infoClient';
import { subscriptionManager } from '@/lib/hyperliquid/subscription';
import type { Market, RawMarketMeta, RawAssetContext, convertRawMarket } from '../ports/types';

/**
 * Subscription handle for cleanup
 */
export interface SubscriptionHandle {
  unsubscribe: () => Promise<void>;
}

/**
 * Hyperliquid Market Adapter
 *
 * Out Port implementation that connects to Hyperliquid services.
 */
export class HyperliquidMarketAdapter {
  /**
   * Fetch all markets from Hyperliquid API
   *
   * Fetches meta.universe and assetCtxs, then converts to Market domain type.
   *
   * @returns Array of Market objects
   */
  async fetchMarkets(): Promise<Market[]> {
    // Fetch meta and asset contexts
    const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();

    // Convert to domain Market type
    const markets: Market[] = meta.universe.map((asset: any, index: number) => {
      const rawMeta: RawMarketMeta = {
        name: asset.name,
        szDecimals: asset.szDecimals || 0,
        maxLeverage: asset.maxLeverage || 1,
      };

      const ctx = assetCtxs[index];
      const rawCtx: RawAssetContext = {
        markPx: ctx.markPx,
        prevDayPx: ctx.prevDayPx,
        funding: ctx.funding,
        dayNtlVlm: ctx.dayNtlVlm,
      };

      // Use pure function from ports/types.ts
      // Import it dynamically to avoid circular dependency
      const { convertRawMarket } = require('../ports/types');
      return convertRawMarket(rawMeta, rawCtx, index);
    });

    return markets;
  }

  /**
   * Subscribe to realtime price updates (allMids)
   *
   * Subscribes to WebSocket allMids channel and invokes callback
   * whenever prices are updated.
   *
   * @param callback - Called with { coin -> price } map on each update
   * @returns Subscription handle for cleanup
   */
  async subscribeToRealtimePrices(
    callback: (prices: Record<string, string>) => void,
  ): Promise<SubscriptionHandle> {
    // Subscribe to allMids via subscription manager
    const handle = await subscriptionManager.subscribe(
      'allMids',
      {}, // No params for allMids
      data => {
        // data is AllMidsData { mids: Record<string, string> }
        callback(data.mids);
      },
    );

    return {
      unsubscribe: async () => {
        await subscriptionManager.unsubscribe(handle);
      },
    };
  }
}
