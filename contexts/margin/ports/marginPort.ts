/**
 * Margin Port - Business Logic Interface
 *
 * This Port defines the business capabilities that the Margin Context provides.
 * The service manages margin and leverage settings for the selected market,
 * automatically tracking market changes and updating subscriptions.
 */

import type { MarginLeverage, SetMarginLeverageParams } from './types';

export interface MarginPort {
  /**
   * Start the Margin Service
   *
   * Initiates:
   * - Subscribes to marketStore.selectedMarket changes
   * - Auto-manages activeAssetData WebSocket subscriptions
   * - Updates marginStore with real-time leverage data
   */
  start(): void;

  /**
   * Stop the Margin Service
   *
   * Cleans up:
   * - Unsubscribes from market changes
   * - Closes activeAssetData WebSocket subscriptions
   */
  stop(): void;

  /**
   * Get current margin and leverage settings
   *
   * Returns cached data from marginStore (updated by WebSocket).
   *
   * @returns Current margin/leverage settings, or undefined if not loaded
   */
  getMarginLeverage(): MarginLeverage | undefined;

  /**
   * Update margin mode and leverage for the selected market
   *
   * Business logic:
   * 1. Validates leverage is within allowed range
   * 2. Gets exchange client from wallet service
   * 3. Calls Hyperliquid API to update settings
   * 4. WebSocket will automatically update marginStore with new values
   *
   * @param params - New leverage and margin mode settings
   * @throws Error if validation fails or API call fails
   */
  setMarginLeverage(params: SetMarginLeverageParams): Promise<void>;
}
