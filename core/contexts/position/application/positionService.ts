/**
 * Position Service - Core Business Logic
 *
 * This service manages position data by:
 * 1. Monitoring active wallet changes and managing subscription lifecycle
 * 2. Subscribing to position data via WebData2Repository (HTTP + WS hybrid)
 * 3. Extracting non-zero positions from the data stream
 * 4. Enriching positions with market data (markPx, szDecimals)
 * 5. Updating the position store for UI consumption
 */

import type * as hl from '@nktkas/hyperliquid';
import type { WebData2Repository, SubscriptionHandle } from '@/core/infra/hyperliquid/repositories';
import type { MarketPort } from '../adapters/marketAdapter';
import { positionStore } from '../adapters/positionStore';
import { activeWalletStore } from '../../wallet/adapters/activeWalletStore';
import type { EnrichedPosition, Position, PositionPort } from '../ports';

/**
 * Position Service Implementation
 *
 * Manages the position lifecycle and business logic.
 */
export class PositionService implements PositionPort {
  private subscription: SubscriptionHandle | undefined;
  private walletUnsubscribe: (() => void) | undefined;

  constructor(
    private readonly webData2Repository: WebData2Repository,
    private readonly marketAdapter: MarketPort,
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
   * Uses WebData2Repository which handles HTTP + WebSocket hybrid strategy.
   */
  private async startSubscription(userAddress: string): Promise<void> {
    // If already subscribed, stop first
    if (this.subscription) {
      await this.stopSubscription();
    }

    // Set loading state
    positionStore.getState().setLoading(true);

    try {
      // Subscribe to position data via Repository
      // Repository handles HTTP + WS hybrid strategy internally
      this.subscription = await this.webData2Repository.subscribe(
        userAddress,
        (data: hl.WebData2Response) => this.handlePositionDataUpdate(data),
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
   * Handle position data update from subscription
   */
  private handlePositionDataUpdate(data: hl.WebData2Response): void {
    try {
      // Extract non-zero positions
      const positions = this.extractPositions(data);

      // Enrich with market data
      const enrichedPositions = this.enrichPositions(positions);

      // Update store
      positionStore.getState().setPositions(enrichedPositions);
      positionStore.getState().setLoading(false);
    } catch (error) {
      console.error('Failed to process position data update:', error);
      positionStore.getState().setLoading(false);
    }
  }

  /**
   * Extract non-zero positions from position data
   */
  private extractPositions(data: hl.WebData2Response): Position[] {
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
      const market = this.marketAdapter.getMarketByCoin(position.coin);

      return {
        ...position,
        markPx: market?.markPx ?? '0',
        szDecimals: market?.szDecimals ?? 0,
      };
    });
  }
}
