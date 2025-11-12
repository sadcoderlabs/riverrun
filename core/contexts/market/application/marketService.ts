/**
 * Market Service - Core Business Logic
 *
 * This service manages market data by:
 * 1. Auto-loading market data from Hyperliquid API on start
 * 2. Auto-subscribing to realtime price updates (WebSocket allMids)
 * 3. Auto-selecting BTC as default market on first load
 * 4. Managing selected market and favorites
 * 5. Updating the market store for UI consumption
 *
 * This is an autonomous service - it manages its own lifecycle and state.
 */

import type { MarketPort } from '../ports/marketPort';
import type { Market, SelectedMarket, RawMarketMeta, RawAssetContext } from '../ports/types';
import {
  getMarketByCoin,
  formatMarketForSelection,
  getDefaultSelectedMarket,
  convertRawMarket,
} from '../ports/types';
import { marketStore } from '../adapters/marketStore';
import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '@/core/infra/hyperliquid/hyperliquidGateway';

/**
 * Market Service Implementation
 *
 * Manages market data lifecycle and business logic.
 */
export class MarketService implements MarketPort {
  private priceSubscription: SubscriptionHandle | undefined;

  constructor(private readonly hyperliquidGateway: HyperliquidGateway) {}

  /**
   * Start the market service
   *
   * Initiates:
   * - Initial market data load
   * - WebSocket subscription for realtime prices
   * - Auto-selection of default market (BTC)
   */
  start(): void {
    // Load initial data
    this.loadMarkets();

    // Start realtime price updates
    this.startPriceSubscription();
  }

  /**
   * Stop the market service
   *
   * Cleans up:
   * - WebSocket subscriptions
   */
  stop(): void {
    this.stopPriceSubscription();
  }

  /**
   * Manually refresh market data
   *
   * Forces a refresh of market metadata from Hyperliquid API.
   * Useful for pull-to-refresh functionality.
   */
  async refresh(): Promise<void> {
    await this.loadMarkets();
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
      const selectedMarket = formatMarketForSelection(market);
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

  /**
   * Get the currently selected market
   *
   * @returns Current selected market, or undefined if none selected
   */
  getSelectedMarket(): SelectedMarket | undefined {
    return marketStore.getState().selectedMarket;
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Load markets from Hyperliquid API (internal)
   *
   * Fetches market metadata and updates the store.
   * Business logic (convertRawMarket) is handled here in Service layer.
   * Auto-selects BTC as default if no market is currently selected.
   */
  private async loadMarkets(): Promise<void> {
    marketStore.getState().setLoading(true);

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

      marketStore.getState().setLoading(false);
    } catch (error) {
      console.error('[MarketService] Failed to load markets:', error);
      marketStore.getState().setLoading(false);
      throw error;
    }
  }

  /**
   * Start subscribing to realtime price updates (internal)
   *
   * Subscribes to allMids stream and updates market prices in realtime.
   * Gateway handles HTTP+WS hybrid strategy internally.
   */
  private async startPriceSubscription(): Promise<void> {
    // If already subscribed, stop first
    if (this.priceSubscription) {
      await this.stopPriceSubscription();
    }

    try {
      // Subscribe to realtime prices via Gateway (HTTP+WS hybrid)
      this.priceSubscription = await this.hyperliquidGateway.subscribeAllMids(
        (prices: Record<string, string>) => {
          // Update prices in store
          marketStore.getState().updatePrices(prices);
        },
      );
    } catch (error) {
      console.error('[MarketService] Failed to start price subscription:', error);
      throw error;
    }
  }

  /**
   * Stop the current price subscription (internal)
   */
  private async stopPriceSubscription(): Promise<void> {
    if (this.priceSubscription) {
      await this.priceSubscription.unsubscribe();
      this.priceSubscription = undefined;
    }
  }
}
