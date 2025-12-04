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

import type { HyperliquidGateway } from '@/infra/hyperliquid/hyperliquidGateway';
import { marketStore } from '../adapters/marketStore';
import type { MarketPort } from '../ports/marketPort';
import type {
  Hip3RawMarketMeta,
  Market,
  RawAssetContext,
  RawMarketMeta,
  SelectedMarket,
} from '../ports/types';
import {
  convertHip3RawMarket,
  convertRawMarket,
  getDefaultSelectedMarket,
  getMarketByCoin,
} from '../ports/types';

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
   * Includes both validator perps and HIP-3 builder-deployed perps.
   * Auto-selects BTC as default if no market is currently selected.
   */
  async loadMarkets(): Promise<void> {
    try {
      // Fetch spot meta first to build token index -> name map for collateral resolution
      const tokenNameMap = await this.buildTokenNameMap();

      // Fetch validator perps and HIP-3 markets in parallel
      const [validatorMarkets, hip3Markets] = await Promise.all([
        this.loadValidatorMarkets(),
        this.loadHip3Markets(tokenNameMap),
      ]);

      // Merge all markets
      const allMarkets = [...validatorMarkets, ...hip3Markets];

      // Update store
      marketStore.getState().setMarkets(allMarkets);

      // Auto-select default market (BTC) if none selected
      const currentSelectedMarket = marketStore.getState().selectedMarket;
      if (!currentSelectedMarket && allMarkets.length > 0) {
        const defaultMarket = getDefaultSelectedMarket(allMarkets);
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
   * Build token index -> name map from spot meta
   *
   * Used to resolve collateral token names for HIP-3 DEXs.
   * Some DEXs like flx and vntl use USDH instead of USDC.
   */
  private async buildTokenNameMap(): Promise<Map<number, string>> {
    try {
      const spotMeta = await this.hyperliquidGateway.fetchSpotMeta();
      const map = new Map<number, string>();
      for (const token of spotMeta.tokens) {
        map.set(token.index, token.name);
      }
      return map;
    } catch (error) {
      console.warn(
        '[MarketService] Failed to fetch spot meta, using fallback for token names:',
        error,
      );
      // Return a minimal fallback map
      return new Map([[0, 'USDC']]);
    }
  }

  /**
   * Load validator-operated perps (default DEX)
   */
  private async loadValidatorMarkets(): Promise<Market[]> {
    const [meta, assetCtxs] = await this.hyperliquidGateway.fetchMetaAndAssetCtxs();

    return meta.universe.map((asset: any, index: number) => {
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

      return convertRawMarket(rawMeta, rawCtx, index);
    });
  }

  /**
   * Load HIP-3 builder-deployed perps from all active DEXs
   *
   * @param tokenNameMap - Map of token index -> name for resolving collateral tokens
   */
  private async loadHip3Markets(tokenNameMap: Map<number, string>): Promise<Market[]> {
    try {
      // Fetch all HIP-3 DEXs
      const perpDexs = await this.hyperliquidGateway.fetchPerpDexs();

      const allHip3Markets: Market[] = [];
      const loadedDexNames: string[] = [];

      // Iterate through DEXs (index 0 is null for validator perps)
      for (let perpDexIndex = 1; perpDexIndex < perpDexs.length; perpDexIndex++) {
        const dex = perpDexs[perpDexIndex];
        if (!dex) continue;

        try {
          const dexMarkets = await this.loadSingleHip3Dex(dex.name, perpDexIndex, tokenNameMap);
          // Only track DEXs that returned markets (USDC collateral only)
          if (dexMarkets.length > 0) {
            allHip3Markets.push(...dexMarkets);
            loadedDexNames.push(dex.name);
          }
        } catch (error) {
          console.warn(`[MarketService] Failed to load HIP-3 DEX ${dex.name}:`, error);
          // Continue loading other DEXs
        }
      }

      // Store only USDC-collateral HIP-3 DEX names for use by other contexts
      marketStore.getState().setHip3Dexes(loadedDexNames);

      return allHip3Markets;
    } catch (error) {
      console.warn('[MarketService] Failed to load HIP-3 DEXs:', error);
      return []; // Return empty array, don't fail entire load
    }
  }

  /**
   * Load markets from a single HIP-3 DEX
   *
   * @param dexName - DEX name (e.g., "xyz", "flx", "vntl")
   * @param perpDexIndex - Array index from perpDexs response
   * @param tokenNameMap - Map of token index -> name for resolving collateral tokens
   */
  private async loadSingleHip3Dex(
    dexName: string,
    perpDexIndex: number,
    tokenNameMap: Map<number, string>,
  ): Promise<Market[]> {
    const [meta, assetCtxs] = await this.hyperliquidGateway.fetchMetaAndAssetCtxs(dexName);

    // Get collateral token info from meta
    const collateralTokenIndex = (meta as any).collateralToken ?? 0;

    // Skip DEXs that don't use USDC as collateral (e.g., flx/vntl use USDH)
    // Users can't acquire non-USDC collateral tokens without spot trading support
    if (collateralTokenIndex !== 0) {
      return [];
    }

    const collateralTokenName = tokenNameMap.get(collateralTokenIndex) ?? 'USDC';

    return meta.universe
      .map((asset: any, indexInMeta: number) => {
        // Skip delisted assets
        if (asset.isDelisted) return null;

        const rawMeta: Hip3RawMarketMeta = {
          name: asset.name,
          szDecimals: asset.szDecimals || 0,
          maxLeverage: asset.maxLeverage || 1,
          onlyIsolated: asset.onlyIsolated,
          marginMode: asset.marginMode,
          isDelisted: asset.isDelisted,
        };

        const ctx = assetCtxs[indexInMeta];
        const rawCtx: RawAssetContext = {
          markPx: ctx.markPx,
          prevDayPx: ctx.prevDayPx,
          funding: ctx.funding,
          dayNtlVlm: ctx.dayNtlVlm,
        };

        return convertHip3RawMarket(
          rawMeta,
          rawCtx,
          indexInMeta,
          dexName,
          perpDexIndex,
          collateralTokenIndex,
          collateralTokenName,
        );
      })
      .filter((market): market is Market => market !== null);
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
        displayName: market.displayName,
        marketPair: market.marketPair,
        szDecimals: market.szDecimals,
        maxLeverage: market.maxLeverage,
        assetId: market.assetId,
        isHip3: market.isHip3,
        dex: market.dex,
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
