/**
 * Margin Subscription Hook
 *
 * React composition layer for managing margin/leverage WebSocket subscriptions.
 *
 * Responsibilities:
 * - Subscribe to marketStore.selectedMarket changes (reactive)
 * - Auto-manage activeAssetData WebSocket subscriptions
 * - Update marginStore with real-time data
 * - Lifecycle management (subscribe on mount, cleanup on unmount)
 *
 * This hook should be called once at app root level to maintain global
 * subscription state throughout the app lifecycle.
 */

import { useEffect, useRef } from 'react';
import { useMarginStore } from './useMarginStore';
import { marketStore } from '@/contexts/market/adapters/marketStore';
import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '@/infra/hyperliquid/hyperliquidGateway';
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';

/**
 * Hook for managing margin subscription lifecycle
 *
 * @param walletPort - Wallet service for getting active wallet
 * @param hyperliquidGateway - Gateway for WebSocket subscriptions
 */
export function useMarginSubscription(
  walletPort: WalletPort,
  hyperliquidGateway: HyperliquidGateway,
) {
  const activeAssetDataSubscription = useRef<SubscriptionHandle | undefined>(undefined);
  const currentCoin = useRef<string | undefined>(undefined);

  useEffect(() => {
    // Track previous market for comparison
    let prevMarket = marketStore.getState().selectedMarket;

    // Subscribe to market changes
    const unsubscribeMarket = marketStore.subscribe(state => {
      const currentMarket = state.selectedMarket;

      // Only resubscribe if the selected coin actually changed
      if (currentMarket?.coin !== prevMarket?.coin) {
        if (currentMarket) {
          subscribeToMarket(currentMarket.coin);
        } else {
          // No market selected, clean up
          unsubscribeActiveAssetData();
          useMarginStore.getState().clear();
        }
        prevMarket = currentMarket;
      }
    });

    // Initial subscription for currently selected market
    const selectedMarket = marketStore.getState().selectedMarket;
    if (selectedMarket) {
      subscribeToMarket(selectedMarket.coin);
    }

    // Cleanup on unmount
    return () => {
      unsubscribeMarket();
      unsubscribeActiveAssetData();
      useMarginStore.getState().clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Subscribe to activeAssetData for a specific market
   */
  async function subscribeToMarket(coin: string): Promise<void> {
    // Avoid redundant subscriptions
    if (currentCoin.current === coin && activeAssetDataSubscription.current) {
      return;
    }

    // Clean up previous subscription
    await unsubscribeActiveAssetData();

    // Update current coin
    currentCoin.current = coin;

    // Get wallet
    const wallet = await walletPort.active();
    if (!wallet) {
      useMarginStore.getState().clear();
      return;
    }

    try {
      useMarginStore.getState().setLoading(true);

      // Subscribe to activeAssetData (HTTP+WS hybrid)
      activeAssetDataSubscription.current = await hyperliquidGateway.subscribeActiveAssetData(
        { user: wallet.address, coin },
        (data: any) => {
          // Get maxLeverage from market data
          const markets = marketStore.getState().markets;
          const market = markets.find(m => m.coin.toUpperCase() === coin.toUpperCase());

          // Update useMarginStore with new data
          useMarginStore.getState().setMarginLeverage({
            leverage: data.leverage.value,
            marginMode: data.leverage.type,
            minLeverage: 1,
            maxLeverage: market?.maxLeverage || 1,
          });
        },
      );
    } catch (error) {
      console.error('[useMarginSubscription] Failed to subscribe to activeAssetData:', error);
      useMarginStore.getState().setError(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Unsubscribe from activeAssetData
   */
  async function unsubscribeActiveAssetData(): Promise<void> {
    if (activeAssetDataSubscription.current) {
      await activeAssetDataSubscription.current.unsubscribe();
      activeAssetDataSubscription.current = undefined;
      currentCoin.current = undefined;
    }
  }
}
