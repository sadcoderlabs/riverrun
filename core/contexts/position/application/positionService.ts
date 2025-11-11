/**
 * Position Service - Core Business Logic
 *
 * This service manages position data by:
 * 1. Monitoring active wallet changes and managing subscription lifecycle
 * 2. Subscribing to WebData2 updates via PositionDataAdapter (HTTP + WS hybrid)
 * 3. Extracting non-zero positions from the data stream
 * 4. Enriching positions with market data (markPx, szDecimals)
 * 5. Updating the position store for UI consumption
 */

import type { MarketPort } from '../adapters/marketAdapter';
import type { PositionDataAdapter } from '../adapters/positionDataAdapter';
import { positionStore } from '../adapters/positionStore';
import { activeWalletStore } from '../../wallet/adapters/activeWalletStore';
import type {
  EnrichedPosition,
  Position,
  PositionPort,
  SubscriptionHandle,
  WebData2Data,
} from '../ports';

/**
 * Position Service Implementation
 *
 * Manages the position lifecycle and business logic.
 */
export class PositionService implements PositionPort {
  private subscription: SubscriptionHandle | undefined;
  private walletUnsubscribe: (() => void) | undefined;

  constructor(
    private readonly positionDataAdapter: PositionDataAdapter,
    private readonly marketService: MarketPort,
  ) {}

  /**
   * Start the position service
   *
   * Begins monitoring active wallet changes and automatically manages
   * position subscriptions based on the active wallet.
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
   * Stop the position service
   *
   * Stops monitoring wallet changes and cleans up all subscriptions.
   */
  stop(): void {
    // Unsubscribe from wallet changes
    this.walletUnsubscribe?.();
    this.walletUnsubscribe = undefined;

    // Stop position subscription
    this.stopSubscription();
  }

  /**
   * Start subscribing to position updates for a user (internal)
   *
   * Uses HTTP + WebSocket hybrid strategy:
   * - HTTP fetch provides immediate data (~100ms)
   * - WebSocket subscription provides real-time updates
   */
  private async startSubscription(userAddress: string): Promise<void> {
    // If already subscribed, stop first
    if (this.subscription) {
      await this.stopSubscription();
    }

    // Set loading state
    positionStore.getState().setLoading(true);

    try {
      // Start subscription with HTTP + WS hybrid strategy
      this.subscription = await this.positionDataAdapter.startSubscription(
        userAddress,
        (data: WebData2Data) => this.handleWebData2Update(data),
      );
    } catch (error) {
      positionStore.getState().setLoading(false);
      throw error;
    }
  }

  /**
   * Stop the current subscription (internal)
   */
  private async stopSubscription(): Promise<void> {
    if (this.subscription) {
      await this.subscription.unsubscribe();
      this.subscription = undefined;
    }

    // Clear position state
    positionStore.getState().clear();
  }

  /**
   * Get all current positions
   */
  getPositions(): EnrichedPosition[] {
    return positionStore.getState().positions;
  }

  /**
   * Handle WebData2 update from subscription
   */
  private handleWebData2Update(data: WebData2Data): void {
    try {
      // Extract non-zero positions
      const positions = this.extractPositions(data);

      // Enrich with market data
      const enrichedPositions = this.enrichPositions(positions);

      // Update store
      positionStore.getState().setPositions(enrichedPositions);
      positionStore.getState().setLoading(false);
    } catch (error) {
      console.error('Failed to process WebData2 update:', error);
      positionStore.getState().setLoading(false);
    }
  }

  /**
   * Extract non-zero positions from WebData2
   */
  private extractPositions(data: WebData2Data): Position[] {
    if (!data.clearinghouseState?.assetPositions) {
      return [];
    }

    return data.clearinghouseState.assetPositions
      .filter(asset => {
        const szi = Number(asset.position.szi);
        return szi !== 0;
      })
      .map(asset => asset.position);
  }

  /**
   * Enrich positions with market data
   */
  private enrichPositions(positions: Position[]): EnrichedPosition[] {
    return positions.map(position => {
      // Get market data for this coin
      const market = this.marketService.getMarketByCoin(position.coin);

      return {
        ...position,
        markPx: market?.markPx ?? '0',
        szDecimals: market?.szDecimals ?? 0,
      };
    });
  }
}
