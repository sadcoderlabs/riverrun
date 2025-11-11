/**
 * Position Port - Business Logic Interface
 *
 * This port defines the business operations for position management.
 * It abstracts the core business logic from implementation details.
 */

import type { EnrichedPosition, PositionMetrics } from './types';

/**
 * Position Port Interface
 *
 * Provides operations for managing and querying positions.
 */
export interface PositionPort {
  /**
   * Start the position service
   *
   * Begins monitoring active wallet changes and automatically manages
   * position subscriptions based on the active wallet.
   */
  start(): void;

  /**
   * Stop the position service
   *
   * Stops monitoring wallet changes and cleans up all subscriptions.
   */
  stop(): void;

  /**
   * Start subscribing to position updates for a user
   *
   * @param userAddress - User address to subscribe to
   */
  startSubscription(userAddress: string): Promise<void>;

  /**
   * Stop the current subscription
   */
  stopSubscription(): Promise<void>;

  /**
   * Get all current positions
   *
   * @returns Array of enriched positions
   */
  getPositions(): EnrichedPosition[];

  /**
   * Get current position for a specific coin
   *
   * @param coin - Coin symbol (e.g., 'BTC', 'ETH')
   * @returns Position size (positive for long, negative for short, 0 if no position)
   */
  getCurrentPosition(coin: string): number;

  /**
   * Get count of open positions
   *
   * @returns Number of non-zero positions
   */
  getPositionCount(): number;

  /**
   * Calculate position metrics for display
   *
   * @param position - Position to calculate metrics for
   * @returns Position metrics
   */
  calculateMetrics(position: EnrichedPosition): PositionMetrics;
}
