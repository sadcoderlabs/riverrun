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

import type { Fill } from './types';

/**
 * HistoryPort interface
 *
 * Manages user's trading history including:
 * - Fetching historical fills via HTTP
 * - Real-time fill updates via WebSocket
 * - Merging and deduplicating fill data
 */
export interface HistoryPort {
  /**
   * Start monitoring fills for a specific user
   *
   * This will:
   * 1. Fetch historical fills via HTTP
   * 2. Subscribe to real-time fill updates via WebSocket
   * 3. Update the history store with merged data
   *
   * @param userAddress - User's wallet address
   */
  start(userAddress: string): Promise<void>;

  /**
   * Stop monitoring fills
   *
   * Unsubscribes from WebSocket and clears data
   */
  stop(): Promise<void>;

  /**
   * Get current fills from store
   *
   * Returns fills in chronological order (most recent first)
   *
   * @returns Array of fills
   */
  getFills(): Fill[];

  /**
   * Check if service is currently loading data
   *
   * @returns true if fetching initial data
   */
  isLoading(): boolean;

  /**
   * Get current error if any
   *
   * @returns Error or undefined
   */
  getError(): Error | undefined;
}
