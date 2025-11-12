/**
 * Market Port - Business Logic Interface
 *
 * This Port defines the business capabilities that the Market Context provides.
 * It follows the autonomous service pattern where the service manages its own
 * lifecycle and data updates automatically.
 */

import type { Market, SelectedMarket } from './types';

export interface MarketPort {
  /**
   * Start the Market Service
   *
   * Initiates the following:
   * - Loads initial market data from Hyperliquid API
   * - Starts WebSocket subscription for realtime price updates (allMids)
   * - Auto-selects BTC as default market if no market is selected
   */
  start(): void;

  /**
   * Stop the Market Service
   *
   * Cleans up:
   * - Stops WebSocket subscriptions
   * - Clears all interval timers
   */
  stop(): void;

  /**
   * Manually refresh market data from Hyperliquid API
   *
   * Forces a refresh of market metadata (meta, assetCtxs).
   * Useful for pull-to-refresh functionality.
   *
   * @returns Promise that resolves when refresh is complete
   */
  refresh(): Promise<void>;

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

  /**
   * Get the currently selected market
   *
   * @returns Current selected market, or undefined if none selected
   */
  getSelectedMarket(): SelectedMarket | undefined;
}
