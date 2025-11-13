/**
 * Margin Service - Core Business Logic
 *
 * This service manages margin and leverage settings by:
 * 1. Auto-subscribing to marketStore.selectedMarket changes
 * 2. Auto-managing activeAssetData WebSocket subscriptions (switches when market changes)
 * 3. Updating marginStore with real-time data
 * 4. Providing setMarginLeverage business operation
 *
 * This is an autonomous service - it manages its own lifecycle and subscriptions.
 */

import type { MarginPort } from '../ports/marginPort';
import type { MarginLeverage, SetMarginLeverageParams } from '../ports/types';
import { marginStore } from '../adapters/marginStore';
import { marketStore } from '../../market/adapters/marketStore';
import type { WalletPort } from '../../wallet/ports/walletPort';
import type { AgentPort } from '../../agent/ports/agentPort';
import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '@/core/infra/hyperliquid/hyperliquidGateway';

/**
 * Margin Service Implementation
 *
 * Manages margin/leverage data lifecycle and business logic.
 */
export class MarginService implements MarginPort {
  private activeAssetDataSubscription: SubscriptionHandle | undefined;
  private marketStoreUnsubscribe: (() => void) | undefined;
  private currentCoin: string | undefined;

  constructor(
    private readonly walletService: WalletPort,
    private readonly agentPort: AgentPort,
    private readonly hyperliquidGateway: HyperliquidGateway,
  ) {}

  /**
   * Start the margin service
   *
   * Initiates:
   * - Subscription to marketStore.selectedMarket changes
   * - Auto-switching of activeAssetData subscriptions
   */
  start(): void {
    // Subscribe to market changes
    this.marketStoreUnsubscribe = marketStore.subscribe((state, prevState) => {
      const currentMarket = state.selectedMarket;
      const prevMarket = prevState.selectedMarket;

      // Only resubscribe if the selected coin actually changed
      if (currentMarket?.coin !== prevMarket?.coin) {
        if (currentMarket) {
          this.subscribeToMarket(currentMarket.coin);
        } else {
          // No market selected, clean up
          this.unsubscribeActiveAssetData();
          marginStore.getState().clear();
        }
      }
    });

    // Initial subscription for currently selected market
    const selectedMarket = marketStore.getState().selectedMarket;
    if (selectedMarket) {
      this.subscribeToMarket(selectedMarket.coin);
    }
  }

  /**
   * Stop the margin service
   *
   * Cleans up:
   * - Market store subscription
   * - ActiveAssetData WebSocket subscription
   */
  stop(): void {
    // Unsubscribe from market changes
    if (this.marketStoreUnsubscribe) {
      this.marketStoreUnsubscribe();
      this.marketStoreUnsubscribe = undefined;
    }

    // Unsubscribe from activeAssetData
    this.unsubscribeActiveAssetData();

    // Clear store
    marginStore.getState().clear();
  }

  /**
   * Get current margin and leverage settings
   *
   * @returns Current settings from marginStore
   */
  getMarginLeverage(): MarginLeverage | undefined {
    return marginStore.getState().marginLeverage;
  }

  /**
   * Update margin mode and leverage for the selected market
   *
   * Business logic:
   * 1. Validates leverage range
   * 2. Gets exchange client from wallet
   * 3. Calls Hyperliquid API
   * 4. WebSocket will automatically update marginStore
   *
   * @param params - New leverage and margin mode
   */
  async setMarginLeverage(params: SetMarginLeverageParams): Promise<void> {
    const { leverage: newLeverage, marginMode } = params;

    // Business rule: Validate leverage range
    const currentMarginLeverage = this.getMarginLeverage();
    if (!currentMarginLeverage) {
      throw new Error('Margin leverage data is not loaded');
    }

    const { minLeverage, maxLeverage } = currentMarginLeverage;
    if (newLeverage < minLeverage || newLeverage > maxLeverage) {
      throw new Error(`Leverage must be between ${minLeverage} and ${maxLeverage}`);
    }

    // Get selected market
    const selectedMarket = marketStore.getState().selectedMarket;
    if (!selectedMarket) {
      throw new Error('No market selected');
    }

    // Get market data for assetId
    const markets = marketStore.getState().markets;
    const market = markets.find(m => m.coin === selectedMarket.coin);
    if (!market) {
      throw new Error(`Market not found for ${selectedMarket.coin}`);
    }

    // Get agent wallet and exchange client
    const { agentWallet } = await this.agentPort.tryGetAgentWallet();
    if (!agentWallet) {
      throw new Error('Agent wallet not available');
    }

    const exchangeClient = this.hyperliquidGateway.getAgentExchangeClient(agentWallet.signer);

    // Convert marginMode to isCross for API
    const isCross = marginMode === 'cross';

    try {
      // Call Hyperliquid API to update leverage
      await exchangeClient.updateLeverage({
        asset: market.assetId,
        isCross,
        leverage: newLeverage,
      });

      // WebSocket will automatically update marginStore with new values
      // No need to manually update the store
    } catch (error) {
      console.error('[MarginService] Failed to update margin/leverage:', error);
      throw error;
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Subscribe to activeAssetData for a specific market
   *
   * Automatically switches subscription when market changes.
   */
  private async subscribeToMarket(coin: string): Promise<void> {
    // Avoid redundant subscriptions
    if (this.currentCoin === coin && this.activeAssetDataSubscription) {
      return;
    }

    // Clean up previous subscription
    await this.unsubscribeActiveAssetData();

    // Update current coin
    this.currentCoin = coin;

    // Get wallet
    const wallet = await this.walletService.active();
    if (!wallet) {
      marginStore.getState().clear();
      return;
    }

    try {
      marginStore.getState().setLoading(true);

      // Subscribe to activeAssetData (HTTP+WS hybrid)
      this.activeAssetDataSubscription = await this.hyperliquidGateway.subscribeActiveAssetData(
        { user: wallet.address, coin },
        (data: any) => {
          // Get maxLeverage from market data
          const markets = marketStore.getState().markets;
          const market = markets.find(m => m.coin.toUpperCase() === coin.toUpperCase());

          // Update marginStore with new data
          marginStore.getState().setMarginLeverage({
            leverage: data.leverage.value,
            marginMode: data.leverage.type,
            minLeverage: 1,
            maxLeverage: market?.maxLeverage || 1,
          });
        },
      );
    } catch (error) {
      console.error('[MarginService] Failed to subscribe to activeAssetData:', error);
      marginStore.getState().setError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Unsubscribe from activeAssetData
   */
  private async unsubscribeActiveAssetData(): Promise<void> {
    if (this.activeAssetDataSubscription) {
      await this.activeAssetDataSubscription.unsubscribe();
      this.activeAssetDataSubscription = undefined;
      this.currentCoin = undefined;
    }
  }
}
