/**
 * useMarginSubscription - Manages real-time margin/leverage data subscriptions
 *
 * This hook automatically:
 * - Monitors active wallet changes
 * - Monitors selected market changes
 * - Subscribes to activeAssetData via HTTP + WebSocket hybrid
 * - Extracts leverage data from data stream
 * - Enriches data with market info (maxLeverage)
 * - Updates margin store with enriched data
 *
 * Design: React Hook for subscription management
 * - Embraces React lifecycle (useEffect)
 * - Manages subscriptions automatically
 * - Updates marginStore directly
 */

import type { MarginLeverage } from '@/contexts/margin/ports/types';
import { marketStore } from '@/contexts/market/adapters/marketStore';
import type { TelemetryPort } from '@/contexts/telemetry/ports/telemetryPort';
import {
  HyperliquidGateway,
  type SubscriptionHandle,
} from '@/infra/hyperliquid/hyperliquidGateway';
import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import { useWallet } from '../../wallet/hooks/useWallet';
import { useMarginStore } from './useMarginStore';

// ============================================================================
// Data Processing Functions (Testable)
// ============================================================================

/**
 * Extract margin/leverage data from activeAssetData response
 * Exported for testing purposes
 */
export function extractMarginData(
  data: any,
  coin: string,
  markets: { coin: string; maxLeverage: number }[],
): MarginLeverage {
  // Find market to get maxLeverage
  const market = markets.find(m => m.coin.toUpperCase() === coin.toUpperCase());

  return {
    leverage: data.leverage.value,
    marginMode: data.leverage.type,
    minLeverage: 1,
    maxLeverage: market?.maxLeverage || 1,
  };
}

// ============================================================================
// Subscription Hook
// ============================================================================

/**
 * useMarginSubscription - Automatically manages margin subscriptions
 *
 * Usage:
 * ```tsx
 * export function AppServicesProvider({ children }) {
 *   useMarginSubscription();  // No parameters needed
 *   return <AppContainerContext.Provider>{children}</AppContainerContext.Provider>;
 * }
 * ```
 */
export function useMarginSubscription(telemetryService: TelemetryPort) {
  // Get active wallet address from React Context
  const { address: walletAddress } = useWallet();
  const selectedMarket = useStore(marketStore, state => state.selectedMarket);
  const coin = selectedMarket?.coin;
  const gateway = useMemo(() => new HyperliquidGateway(), []);

  useEffect(() => {
    // No wallet or market - clear margin data
    if (!walletAddress || !coin) {
      useMarginStore.getState().clear();
      return;
    }

    // Note: activeAssetData works with HIP-3 coin names (e.g., "xyz:GOOGL")
    let subscription: SubscriptionHandle | undefined;
    let isCancelled = false;

    (async () => {
      try {
        useMarginStore.getState().setLoading(true);

        // Subscribe to activeAssetData via Gateway
        // Gateway handles HTTP + WS hybrid strategy internally
        subscription = await gateway.subscribeActiveAssetData(
          { user: walletAddress, coin },
          (data: any) => {
            // Don't process if effect was cancelled
            if (!isCancelled) {
              try {
                // Get current markets for enrichment
                const markets = marketStore.getState().markets;

                // Extract and enrich margin data
                const marginData = extractMarginData(data, coin, markets);

                // Update store
                useMarginStore.getState().setMarginLeverage(marginData);
              } catch (error) {
                console.error('[useMarginSubscription] Failed to process margin data:', error);
                telemetryService.captureError(error, {
                  component: 'useMarginSubscription',
                  action: 'processMarginData',
                  extra: { walletAddress, coin },
                });
                useMarginStore
                  .getState()
                  .setError(error instanceof Error ? error : new Error(String(error)));
              }
            }
          },
        );
      } catch (error) {
        console.error('[useMarginSubscription] Failed to start subscription:', error);
        telemetryService.captureError(error, {
          component: 'useMarginSubscription',
          action: 'startSubscription',
          extra: { walletAddress, coin },
        });
        if (!isCancelled) {
          useMarginStore
            .getState()
            .setError(error instanceof Error ? error : new Error(String(error)));
        }
      }
    })();

    // Cleanup function
    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
      useMarginStore.getState().clear();
    };
  }, [walletAddress, coin, gateway, telemetryService]);
}
