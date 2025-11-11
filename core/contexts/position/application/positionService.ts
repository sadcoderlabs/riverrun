/**
 * Position Service - Core Business Logic
 *
 * This service manages position data by:
 * 1. Subscribing to WebData2 updates via SubscriptionPort
 * 2. Extracting non-zero positions from the data stream
 * 3. Enriching positions with market data (markPx, szDecimals)
 * 4. Calculating position metrics (funding, PnL, side)
 * 5. Updating the position store for UI consumption
 */

import type { MarketPort } from '../adapters/marketAdapter';
import { positionStore } from '../adapters/positionStore';
import type {
  EnrichedPosition,
  Position,
  PositionMetrics,
  PositionPort,
  SubscriptionHandle,
  SubscriptionPort,
  WebData2Data,
} from '../ports';

/**
 * Position Service Implementation
 *
 * Manages the position lifecycle and business logic.
 */
export class PositionService implements PositionPort {
  private subscription: SubscriptionHandle | undefined;

  constructor(
    private readonly subscriptionPort: SubscriptionPort,
    private readonly marketService: MarketPort,
  ) {}

  /**
   * Start subscribing to position updates for a user
   */
  async startSubscription(userAddress: string): Promise<void> {
    // If already subscribed, stop first
    if (this.subscription) {
      await this.stopSubscription();
    }

    // Set loading state
    positionStore.getState().setLoading(true);

    try {
      // Subscribe to WebData2 stream
      this.subscription = await this.subscriptionPort.subscribeWebData2(userAddress, data =>
        this.handleWebData2Update(data),
      );
    } catch (error) {
      positionStore.getState().setLoading(false);
      throw error;
    }
  }

  /**
   * Stop the current subscription
   */
  async stopSubscription(): Promise<void> {
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
   * Get current position for a specific coin
   */
  getCurrentPosition(coin: string): number {
    const positions = this.getPositions();
    const position = positions.find(p => p.coin === coin);
    return position ? Number(position.szi) : 0;
  }

  /**
   * Get count of open positions
   */
  getPositionCount(): number {
    return positionStore.getState().positionCount;
  }

  /**
   * Calculate position metrics for display
   */
  calculateMetrics(position: EnrichedPosition): PositionMetrics {
    const szi = Number(position.szi);
    const unrealizedPnl = Number(position.unrealizedPnl);

    // Determine position side
    const side: 'Long' | 'Short' = szi > 0 ? 'Long' : 'Short';

    // Funding from API is from funding rate perspective
    // For Long positions: we PAY funding (so invert the sign)
    // For Short positions: we RECEIVE funding (keep the sign)
    const fundingFromApi = Number(position.cumFunding.sinceOpen);
    const funding = szi > 0 ? -fundingFromApi : fundingFromApi;

    return {
      funding,
      isFundingPositive: funding > 0,
      side,
      isPnlPositive: unrealizedPnl > 0,
    };
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
