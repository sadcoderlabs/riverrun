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
  /** Market trading pair (e.g., "BTC-USDC" for perpetuals) */
  marketPair: string;
  /** Coin symbol (e.g., "BTC", "ETH", "xyz:TSLA" for HIP-3) */
  coin: string;
  /** Display name for UI (e.g., "BTC", "TSLA" - strips dex prefix for HIP-3) */
  displayName: string;
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

  // HIP-3 specific fields
  /** DEX name for HIP-3 assets (e.g., "xyz"), undefined for validator perps */
  dex?: string;
  /** Array index from perpDexs response (1, 2, 3...), undefined for validator perps */
  perpDexIndex?: number;
  /** Whether this is a HIP-3 builder-deployed perp */
  isHip3: boolean;
  /** Whether only isolated margin is allowed (always true for HIP-3) */
  isolatedOnly: boolean;
  /** Collateral token index (0 = USDC) */
  collateralTokenIndex: number;
  /** Collateral token name (e.g., "USDC") */
  collateralTokenName: string;

  // HIP-3 fee-related fields
  /** Growth mode status for HIP-3 assets (reduces fees by 90% when enabled) */
  growthMode?: 'enabled';
  /** Deployer fee scale from perpDexs (affects HIP-3 fee multiplier) */
  deployerFeeScale?: number;
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
  /** Display name for UI (e.g., "BTC", "TSLA" - strips dex prefix for HIP-3) */
  displayName: string;
  /** Market trading pair for display (e.g., "BTC-USDC", "GOOGL-USDC") */
  marketPair: string;
  /** Size decimals for price formatting */
  szDecimals: number;
  /** Maximum leverage available for this market */
  maxLeverage: number;
  /** Asset ID used by Hyperliquid API */
  assetId: number;
  /** Whether this is a HIP-3 builder-deployed perp */
  isHip3: boolean;
  /** DEX name for HIP-3 assets (e.g., "xyz"), undefined for validator perps */
  dex?: string;
  /** Growth mode status for HIP-3 assets (reduces fees by 90% when enabled) */
  growthMode?: 'enabled';
  /** Deployer fee scale from perpDexs (affects HIP-3 fee multiplier) */
  deployerFeeScale?: number;
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
 * Convert raw Hyperliquid API data to Market domain type (validator perps)
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
  const marketPair = `${assetName}-USDC`;

  return {
    marketPair,
    coin: assetName,
    displayName: assetName,
    assetId,
    price: currentPrice,
    markPx: ctx.markPx,
    change: priceChange,
    maxLeverage: meta.maxLeverage || 1,
    fundingRate,
    volume,
    szDecimals: meta.szDecimals || 0,
    // Validator perps defaults
    dex: undefined,
    perpDexIndex: undefined,
    isHip3: false,
    isolatedOnly: false,
    collateralTokenIndex: 0,
    collateralTokenName: 'USDC',
  };
}

/**
 * HIP-3 specific raw market meta from API
 */
export interface Hip3RawMarketMeta extends RawMarketMeta {
  onlyIsolated?: boolean;
  marginMode?: 'strictIsolated' | 'noCross';
  isDelisted?: boolean;
  /** Growth mode status (reduces fees by 90% when enabled) */
  growthMode?: 'enabled';
}

/**
 * Convert raw HIP-3 API data to Market domain type
 *
 * @param meta - Market metadata from meta.universe
 * @param ctx - Asset context from assetCtxs
 * @param indexInMeta - Index in the DEX's meta.universe array
 * @param dex - DEX name (e.g., "xyz")
 * @param perpDexIndex - Array index from perpDexs response (1, 2, 3...)
 * @param collateralTokenIndex - Collateral token index (0 = USDC)
 * @param collateralTokenName - Collateral token name
 * @param deployerFeeScale - Fee scale from perpDexs response (affects HIP-3 fee multiplier)
 * @returns Market domain object
 */
export function convertHip3RawMarket(
  meta: Hip3RawMarketMeta,
  ctx: RawAssetContext,
  indexInMeta: number,
  dex: string,
  perpDexIndex: number,
  collateralTokenIndex: number,
  collateralTokenName: string,
  deployerFeeScale: number,
): Market {
  // HIP-3 asset ID formula: 100000 + (perpDexIndex * 10000) + indexInMeta
  const assetId = 100000 + perpDexIndex * 10000 + indexInMeta;

  const assetName = meta.name; // Already includes dex prefix like "xyz:TSLA"
  // Extract display name by stripping dex prefix (e.g., "xyz:TSLA" -> "TSLA")
  const displayName = assetName.includes(':') ? assetName.split(':')[1] : assetName;
  const currentPrice = parseFloat(ctx.markPx);
  const prevDayPrice = parseFloat(ctx.prevDayPx);
  const priceChange = prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;
  const fundingRate = parseFloat(ctx.funding) * 100;
  const volume = parseFloat(ctx.dayNtlVlm || '0');
  const marketPair = `${displayName}-${collateralTokenName}`;

  return {
    marketPair,
    coin: assetName,
    displayName,
    assetId,
    price: currentPrice,
    markPx: ctx.markPx,
    change: priceChange,
    maxLeverage: meta.maxLeverage || 1,
    fundingRate,
    volume,
    szDecimals: meta.szDecimals || 0,
    // HIP-3 specific
    dex,
    perpDexIndex,
    isHip3: true,
    isolatedOnly: true, // HIP-3 is always isolated-only
    collateralTokenIndex,
    collateralTokenName,
    // HIP-3 fee-related
    growthMode: meta.growthMode,
    deployerFeeScale,
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
        displayName: btcMarket.displayName,
        marketPair: btcMarket.marketPair,
        szDecimals: btcMarket.szDecimals,
        maxLeverage: btcMarket.maxLeverage,
        assetId: btcMarket.assetId,
        isHip3: btcMarket.isHip3,
        dex: btcMarket.dex,
        growthMode: btcMarket.growthMode,
        deployerFeeScale: btcMarket.deployerFeeScale,
      }
    : undefined;
}
