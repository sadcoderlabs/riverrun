/**
 * Market Service - Core Business Logic
 *
 * This service manages market data by:
 * 1. Loading market data from Hyperliquid API
 * 2. Auto-selecting BTC as default market on first load
 * 3. Managing selected market and favorites
 * 4. Providing market query methods for other contexts
 *
 * Note: Real-time price updates are handled by MarketSelectorModal directly.
 * This service only loads static market metadata.
 */

import type { MarketPort } from '../ports/marketPort';
import type { Market, SelectedMarket, RawMarketMeta, RawAssetContext } from '../ports/types';
import { getMarketByCoin, getDefaultSelectedMarket, convertRawMarket } from '../ports/types';
import { marketStore } from '../adapters/marketStore';
import type { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';

/**
 * Market Service Implementation
 *
 * Manages market data and business logic.
 */
export class MarketService implements MarketPort {
  constructor(private readonly hyperliquidGateway: HyperliquidGateway) {}

  /**
   * Load market data from Hyperliquid API
   *
   * Fetches market metadata and updates the store.
   * Auto-selects BTC as default if no market is currently selected.
   */
  async loadMarkets(): Promise<void> {
    try {
      // Fetch raw market data from Hyperliquid via Gateway
      const [meta, assetCtxs] = await this.hyperliquidGateway.fetchMetaAndAssetCtxs();

      // Business logic: Convert raw data to domain Market type
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

        // Use pure function from ports to convert
        return convertRawMarket(rawMeta, rawCtx, index);
      });

      // Update store
      marketStore.getState().setMarkets(markets);

      // Auto-select default market (BTC) if none selected
      const currentSelectedMarket = marketStore.getState().selectedMarket;
      if (!currentSelectedMarket && markets.length > 0) {
        const defaultMarket = getDefaultSelectedMarket(markets);
        if (defaultMarket) {
          marketStore.getState().setSelectedMarket(defaultMarket);
        }
      }
    } catch (error) {
      console.error('[MarketService] Failed to load markets:', error);
      throw error;
    }
  }

  /**
   * Set the currently selected market by coin symbol
   *
   * @param coin - Coin symbol (case-insensitive)
   */
  setSelectedMarketByCoin(coin: string): void {
    const markets = marketStore.getState().markets;
    const market = getMarketByCoin(markets, coin);

    if (market) {
      const selectedMarket: SelectedMarket = {
        coin: market.coin,
        marketPair: market.marketPair,
        szDecimals: market.szDecimals,
        maxLeverage: market.maxLeverage,
      };
      marketStore.getState().setSelectedMarket(selectedMarket);
    } else {
      console.warn(`[MarketService] Market not found: ${coin}`);
    }
  }

  /**
   * Toggle favorite status for a market
   *
   * @param coin - Coin symbol to toggle
   */
  toggleFavorite(coin: string): void {
    marketStore.getState().toggleFavorite(coin);
  }

  /**
   * Get a specific market by coin symbol
   *
   * This is a query method used by other contexts (e.g., PositionService).
   *
   * @param coin - Coin symbol to look up
   * @returns Market if found, undefined otherwise
   */
  getMarketByCoin(coin: string): Market | undefined {
    const markets = marketStore.getState().markets;
    return getMarketByCoin(markets, coin);
  }
}
