/**
 * Market Adapter - Bridge to existing market system
 *
 * This adapter provides access to market data needed by PositionService.
 * It wraps the existing useMarketsStore until the market context is refactored.
 */

import { useMarketsStore } from '@/lib/riverrun/market';
import type { Market } from '@/lib/riverrun/market/types';

/**
 * Market data needed for position enrichment
 */
export interface MarketData {
  markPx: string;
  szDecimals: number;
}

/**
 * Market Port Interface
 *
 * Abstracts market data access for position enrichment.
 */
export interface MarketPort {
  /**
   * Get market data by coin symbol
   *
   * @param coin - Coin symbol (e.g., 'BTC', 'ETH')
   * @returns Market data or undefined if not found
   */
  getMarketByCoin(coin: string): MarketData | undefined;
}

/**
 * Market Adapter Implementation
 *
 * Bridges position context with the existing market store.
 */
export class MarketAdapter implements MarketPort {
  /**
   * Get market data by coin symbol
   */
  getMarketByCoin(coin: string): MarketData | undefined {
    const markets = useMarketsStore.getState().markets;
    const market = markets.find((m: Market) => m.coin === coin);

    if (!market) {
      return undefined;
    }

    return {
      markPx: market.price.toString(),
      szDecimals: market.szDecimals,
    };
  }
}
