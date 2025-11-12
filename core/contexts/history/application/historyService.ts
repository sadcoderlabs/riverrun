/**
 * HistoryService - Core business logic for trading history
 *
 * This service implements the HistoryPort interface and coordinates
 * fill history operations including:
 * - Fetching historical fills via HTTP
 * - Real-time fill updates via WebSocket
 * - Merging and deduplicating fill data
 *
 * Design principles:
 * - Pure business logic (no React dependencies)
 * - Uses HyperliquidGateway for data access
 * - Updates historyStore for reactive UI
 * - Autonomous lifecycle (start/stop)
 *
 * Data flow:
 * 1. HTTP fetch → initial fills → store
 * 2. WebSocket → incremental updates → merge with store
 * 3. Store → reactive UI updates
 */

import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '../../../infra/hyperliquid/hyperliquidGateway';
import { historyStore } from '../adapters/historyStore';
import type { HistoryPort } from '../ports/historyPort';
import type { Fill } from '../ports/types';

/**
 * WebSocket fill update event
 * Matches Hyperliquid SDK's WsUserFillsEvent type
 */
interface WsFillUpdate {
  user: string;
  fills: Fill[];
}

/**
 * HistoryService implementation
 */
export class HistoryService implements HistoryPort {
  /** WebSocket subscription handle */
  private subscription: SubscriptionHandle | undefined;

  /** Current monitored user address */
  private currentUserAddress: string | undefined;

  /** Loading state flag */
  private loading = false;

  /** Error state */
  private error: Error | undefined;

  constructor(private readonly hyperliquidGateway: HyperliquidGateway) {}

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
  async start(userAddress: string): Promise<void> {
    // If already monitoring the same address, do nothing
    if (this.currentUserAddress === userAddress && this.subscription) {
      return;
    }

    // Stop previous subscription if monitoring a different address
    if (this.subscription) {
      await this.stop();
    }

    this.currentUserAddress = userAddress;
    this.loading = true;
    this.error = undefined;
    historyStore.getState().setLoading(true);
    historyStore.getState().setError(undefined);

    try {
      // Step 1: Fetch historical fills via HTTP
      const fills = (await this.hyperliquidGateway.fetchUserFills(userAddress)) as Fill[];

      // Sort by time (most recent first)
      const sortedFills = fills.sort((a, b) => b.time - a.time);

      // Update store with initial data
      historyStore.getState().setFills(sortedFills);

      // Step 2: Subscribe to WebSocket for real-time updates
      this.subscription = await this.hyperliquidGateway.subscribeUserFills(
        userAddress,
        (data: unknown) => this.handleFillUpdate(data as WsFillUpdate),
      );

      this.loading = false;
      historyStore.getState().setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      this.error = error;
      this.loading = false;
      historyStore.getState().setLoading(false);
      historyStore.getState().setError(error);

      console.error('[HistoryService] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop monitoring fills
   *
   * Unsubscribes from WebSocket and clears data
   */
  async stop(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    this.currentUserAddress = undefined;
    this.loading = false;
    this.error = undefined;

    // Clear store
    historyStore.getState().clear();
  }

  /**
   * Get current fills from store
   *
   * Returns fills in chronological order (most recent first)
   *
   * @returns Array of fills
   */
  getFills(): Fill[] {
    return historyStore.getState().fills;
  }

  /**
   * Check if service is currently loading data
   *
   * @returns true if fetching initial data
   */
  isLoading(): boolean {
    return this.loading;
  }

  /**
   * Get current error if any
   *
   * @returns Error or undefined
   */
  getError(): Error | undefined {
    return this.error;
  }

  /**
   * Handle WebSocket fill update
   *
   * Merges new fills with existing fills in the store
   *
   * @private
   */
  private handleFillUpdate(data: WsFillUpdate): void {
    if (!data.fills || data.fills.length === 0) {
      return;
    }

    // Merge new fills with existing fills (deduplication by tid)
    historyStore.getState().mergeFills(data.fills);
  }
}
