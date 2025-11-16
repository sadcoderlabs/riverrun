/**
 * Market Port - Business Logic Interface
 *
 * This Port defines the business capabilities that the Market Context provides.
 */

import type { Market } from './types';

export interface MarketPort {
  /**
   * Load market data from Hyperliquid API
   *
   * Fetches market metadata and updates the store.
   * Auto-selects BTC as default market if no market is currently selected.
   *
   * @returns Promise that resolves when loading is complete
   */
  loadMarkets(): Promise<void>;

  /**
   * Set the currently selected market by coin symbol
   *
   * Updates the selectedMarket in the store.
   * If the market is not found, logs a warning and does nothing.
   *
   * @param coin - Coin symbol (case-insensitive, e.g., "BTC", "eth")
   */
  setSelectedMarketByCoin(coin: string): void;

  /**
   * Toggle favorite status for a market
   *
   * Adds or removes the coin from the favorites list.
   * Favorites are persisted to AsyncStorage automatically.
   *
   * @param coin - Coin symbol to toggle
   */
  toggleFavorite(coin: string): void;

  /**
   * Get a specific market by coin symbol
   *
   * This is a query method used by other contexts (e.g., PositionService).
   *
   * @param coin - Coin symbol to look up
   * @returns Market if found, undefined otherwise
   */
  getMarketByCoin(coin: string): Market | undefined;
}
