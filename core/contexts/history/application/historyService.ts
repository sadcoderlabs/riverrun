/**
 * HistoryService - Core business logic for trading history
 *
 * This service implements the HistoryPort interface and coordinates
 * fill history operations including:
 * - Monitoring active wallet changes
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
 * 1. Monitor activeWalletStore changes
 * 2. HTTP fetch → initial fills → store
 * 3. WebSocket → incremental updates → merge with store
 * 4. Store → reactive UI updates
 */

import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '../../../infra/hyperliquid/hyperliquidGateway';
import { historyStore } from '../adapters/historyStore';
import { activeWalletStore } from '../../wallet/adapters/activeWalletStore';
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
 *
 * Manages the fill history lifecycle and business logic.
 */
export class HistoryService implements HistoryPort {
  /** WebSocket subscription handle */
  private subscription: SubscriptionHandle | undefined;

  /** Wallet store unsubscribe function */
  private walletUnsubscribe: (() => void) | undefined;

  constructor(private readonly hyperliquidGateway: HyperliquidGateway) {}

  /**
   * Start the history service
   *
   * Begins monitoring active wallet changes and automatically manages
   * fill subscriptions based on the active wallet.
   */
  start(): void {
    // Subscribe to activeWalletStore to monitor wallet changes
    this.walletUnsubscribe = activeWalletStore.subscribe((state, prevState) => {
      // Only react to wallet changes
      if (state.wallet?.address !== prevState.wallet?.address) {
        if (state.wallet) {
          // Wallet is connected, start subscription
          this.startSubscription(state.wallet.address);
        } else {
          // Wallet disconnected, stop subscription
          this.stopSubscription();
        }
      }
    });

    // Handle initial state
    const currentWallet = activeWalletStore.getState().wallet;
    if (currentWallet) {
      this.startSubscription(currentWallet.address);
    }
  }

  /**
   * Stop the history service
   *
   * Stops monitoring wallet changes and cleans up all subscriptions.
   */
  stop(): void {
    // Unsubscribe from wallet changes
    this.walletUnsubscribe?.();
    this.walletUnsubscribe = undefined;

    // Stop fill subscription
    this.stopSubscription();
  }

  /**
   * Start subscribing to fill updates for a user (internal)
   *
   * @private
   */
  private async startSubscription(userAddress: string): Promise<void> {
    // Stop previous subscription if exists
    await this.stopSubscription();

    historyStore.getState().setLoading(true);
    historyStore.getState().setError(undefined);

    try {
      // Step 1: Fetch historical fills via HTTP
      const fills = (await this.hyperliquidGateway.fetchUserFills(userAddress)) as Fill[];

      // Sort by time (most recent first) - business logic here
      const sortedFills = fills.sort((a, b) => b.time - a.time);

      // Update store with initial data
      historyStore.getState().setFills(sortedFills);

      // Step 2: Subscribe to WebSocket for real-time updates
      this.subscription = await this.hyperliquidGateway.subscribeUserFills(
        userAddress,
        (data: unknown) => this.handleFillUpdate(data as WsFillUpdate),
      );

      historyStore.getState().setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      historyStore.getState().setLoading(false);
      historyStore.getState().setError(error);

      console.error('[HistoryService] Failed to start subscription:', error);
    }
  }

  /**
   * Stop fill subscription (internal)
   *
   * @private
   */
  private async stopSubscription(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    // Clear store
    historyStore.getState().clear();
  }

  /**
   * Handle WebSocket fill update
   *
   * Merges new fills with existing fills (business logic)
   *
   * @private
   */
  private handleFillUpdate(data: WsFillUpdate): void {
    if (!data.fills || data.fills.length === 0) {
      return;
    }

    // Get current fills from store
    const currentFills = historyStore.getState().fills;

    // Merge new fills with existing fills (deduplication by tid) - business logic here
    const fillMap = new Map<number, Fill>();

    // Add existing fills
    currentFills.forEach(fill => fillMap.set(fill.tid, fill));

    // Add/update with new fills from WebSocket
    data.fills.forEach(fill => fillMap.set(fill.tid, fill));

    // Convert back to array and sort by time (most recent first)
    const mergedFills = Array.from(fillMap.values()).sort((a, b) => b.time - a.time);

    // Update store with merged fills
    historyStore.getState().setFills(mergedFills);
  }
}
