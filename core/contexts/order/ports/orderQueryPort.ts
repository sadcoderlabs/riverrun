/**
 * Order Query Port - Business interface for order read operations and subscriptions
 *
 * This Port defines the query side of order operations:
 * - Lifecycle management for real-time order subscriptions
 * - Autonomous wallet monitoring
 * - Order store updates
 *
 * Design: Autonomous Service Pattern (CQRS Query Side)
 * - Automatically monitors wallet changes
 * - Manages subscription lifecycle internally
 * - Updates store directly (no return values needed)
 */

/**
 * Order Query Port - Interface for order read operations and subscriptions
 */
export interface OrderQueryPort {
  /**
   * Start the Order Query Service
   * Begins monitoring wallet changes and automatically manages open orders subscription
   */
  start(): void;

  /**
   * Stop the Order Query Service
   * Stops monitoring and cleans up all subscriptions
   */
  stop(): void;
}
