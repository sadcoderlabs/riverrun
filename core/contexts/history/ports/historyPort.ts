/**
 * HistoryPort - Port interface for History business logic
 *
 * This defines the contract for the History service which manages
 * trading history (fills/executed trades).
 *
 * Design principles:
 * - Port pattern: Defines interface without implementation details
 * - Autonomous lifecycle: start/stop methods for data subscription management
 * - Read-only: History is immutable, only retrieval operations
 */

/**
 * HistoryPort interface
 *
 * Manages user's trading history including:
 * - Monitoring active wallet changes
 * - Fetching historical fills via HTTP
 * - Real-time fill updates via WebSocket
 * - Merging and deduplicating fill data
 */
export interface HistoryPort {
  /**
   * Start the history service
   *
   * Begins monitoring active wallet changes and automatically manages
   * fill subscriptions based on the active wallet.
   */
  start(): void;

  /**
   * Stop the history service
   *
   * Stops monitoring wallet changes and cleans up all subscriptions.
   */
  stop(): void;
}
