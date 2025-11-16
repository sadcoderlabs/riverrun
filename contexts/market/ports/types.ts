/**
 * Market Domain Types
 *
 * Core domain types and pure functions for the Market context.
 */

/**
 * Market data type representing a trading market
 *
 * Contains both static metadata (assetId, szDecimals, maxLeverage)
 * and dynamic data (price, change, fundingRate, volume).
 */
export type Market = {
  /** Market trading pair (e.g., "BTC-USD" for perpetuals) */
  marketPair: string;
  /** Coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Asset ID used by Hyperliquid API for order placement */
  assetId: number;
  /** Current market price (number) */
  price: number;
  /** Current mark price (string, compatible with other contexts) */
  markPx: string;
  /** 24-hour price change percentage */
  change: number;
  /** Maximum leverage allowed for this market */
  maxLeverage: number;
  /** Current funding rate percentage */
  fundingRate: number;
  /** 24-hour trading volume in USD */
  volume: number;
  /** Size decimals for price formatting (from Hyperliquid meta) */
  szDecimals: number;
};

/**
 * Selected market information
 *
 * Contains minimal data about the currently selected trading market.
 * This is a value object extracted from a full Market.
 */
export interface SelectedMarket {
  /** Market coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Full market trading pair (e.g., "BTC-USD", "ETH-USD") */
  marketPair: string;
  /** Size decimals for price formatting */
  szDecimals: number;
  /** Maximum leverage available for this market */
  maxLeverage: number;
}

/**
 * Raw market data from Hyperliquid API (meta.universe item)
 */
export interface RawMarketMeta {
  name: string;
  szDecimals: number;
  maxLeverage?: number;
}

/**
 * Raw asset context from Hyperliquid API
 */
export interface RawAssetContext {
  markPx: string;
  prevDayPx: string;
  funding: string;
  dayNtlVlm?: string;
}

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Find a market by coin symbol
 *
 * @param markets - List of markets to search
 * @param coin - Coin symbol (case-insensitive)
 * @returns Market if found, undefined otherwise
 */
export function getMarketByCoin(markets: Market[], coin: string): Market | undefined {
  return markets.find(m => m.coin.toUpperCase() === coin.toUpperCase());
}

/**
 * Merge realtime prices into markets
 *
 * Updates the price and markPx fields of markets based on realtime WebSocket data.
 *
 * @param markets - Current market list
 * @param prices - Realtime prices from WebSocket (coin -> price string)
 * @returns Updated markets with new prices
 */
export function mergeRealtimePrices(markets: Market[], prices: Record<string, string>): Market[] {
  return markets.map(market => {
    const realtimePrice = prices[market.coin];
    if (realtimePrice) {
      const priceNum = parseFloat(realtimePrice);
      return {
        ...market,
        price: priceNum,
        markPx: realtimePrice,
      };
    }
    return market;
  });
}

/**
 * Convert raw Hyperliquid API data to Market domain type
 *
 * @param meta - Market metadata from meta.universe
 * @param ctx - Asset context from assetCtxs
 * @param assetId - Asset ID (index in meta.universe array)
 * @returns Market domain object
 */
export function convertRawMarket(
  meta: RawMarketMeta,
  ctx: RawAssetContext,
  assetId: number,
): Market {
  const assetName = meta.name;
  const currentPrice = parseFloat(ctx.markPx);
  const prevDayPrice = parseFloat(ctx.prevDayPx);
  const priceChange = prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;
  const fundingRate = parseFloat(ctx.funding) * 100;
  const volume = parseFloat(ctx.dayNtlVlm || '0');
  const marketPair = `${assetName}-USD`;

  return {
    marketPair,
    coin: assetName,
    assetId,
    price: currentPrice,
    markPx: ctx.markPx,
    change: priceChange,
    maxLeverage: meta.maxLeverage || 1,
    fundingRate,
    volume,
    szDecimals: meta.szDecimals || 0,
  };
}

/**
 * Get default selected market (BTC)
 *
 * @param markets - List of markets
 * @returns BTC market as SelectedMarket, or undefined if not found
 */
export function getDefaultSelectedMarket(markets: Market[]): SelectedMarket | undefined {
  const btcMarket = getMarketByCoin(markets, 'BTC');
  return btcMarket
    ? {
        coin: btcMarket.coin,
        marketPair: btcMarket.marketPair,
        szDecimals: btcMarket.szDecimals,
        maxLeverage: btcMarket.maxLeverage,
      }
    : undefined;
}
