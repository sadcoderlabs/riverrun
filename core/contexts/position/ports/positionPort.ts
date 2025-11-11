/**
 * Position Port - Business Logic Interface
 *
 * This port defines the business operations for position management.
 * It abstracts the core business logic from implementation details.
 */

/**
 * Position Port Interface
 *
 * Provides operations for managing position subscriptions.
 * Position data is accessed directly via positionStore.
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
}
