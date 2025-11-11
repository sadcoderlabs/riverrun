/**
 * Position Port - Business Logic Interface
 *
 * This port defines the business operations for position management.
 * It abstracts the core business logic from implementation details.
 */

import type { EnrichedPosition } from './types';

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
   * Get all current positions
   *
   * @returns Array of enriched positions
   */
  getPositions(): EnrichedPosition[];
}
