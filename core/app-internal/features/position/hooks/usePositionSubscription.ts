/**
 * usePositionSubscription - Manages real-time position data subscriptions
 *
 * This hook automatically:
 * - Monitors active wallet changes
 * - Subscribes to position data via HTTP + WebSocket hybrid
 * - Extracts non-zero positions from data stream
 * - Enriches positions with market data (markPx, szDecimals)
 * - Updates position store with enriched data
 *
 * Design: React Hook for subscription management
 * - Embraces React lifecycle (useEffect)
 * - Manages subscriptions automatically
 * - Updates positionStore directly
 */

import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';
import type * as hl from '@nktkas/hyperliquid';

import { activeWalletStore } from '@/core/contexts/wallet/adapters/activeWalletStore';
import {
  HyperliquidGateway,
  type SubscriptionHandle,
} from '@/core/infra/hyperliquid/hyperliquidGateway';
import type { MarketPort } from '../../../../contexts/market/ports/marketPort';
import { positionStore } from '../../../../contexts/position/adapters/positionStore';
import type { EnrichedPosition, Position } from '../../../../contexts/position/types';

// ============================================================================
// Data Processing Functions (Testable)
// ============================================================================

/**
 * Extract non-zero positions from WebData2 response
 * Exported for testing purposes
 */
export function extractPositions(data: hl.WebData2Response): Position[] {
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
 * Exported for testing purposes
 */
export function enrichPositions(
  positions: Position[],
  marketAdapter: MarketPort,
): EnrichedPosition[] {
  return positions.map(position => {
    // Get market data for this coin from MarketPort
    const market = marketAdapter.getMarketByCoin(position.coin);

    return {
      ...position,
      markPx: market?.markPx ?? '0',
      szDecimals: market?.szDecimals ?? 0,
    };
  });
}

// ============================================================================
// Subscription Hook
// ============================================================================

/**
 * usePositionSubscription - Automatically manages position subscriptions
 *
 * Usage:
 * ```tsx
 * export function PositionCompositionProvider({ children, marketAdapter }) {
 *   usePositionSubscription(marketAdapter);  // Pass MarketPort dependency
 *   return <PositionContext.Provider>{children}</PositionContext.Provider>;
 * }
 * ```
 */
export function usePositionSubscription(marketAdapter: MarketPort) {
  const wallet = useStore(activeWalletStore, state => state.wallet);
  const walletAddress = wallet?.address;
  const gateway = useMemo(() => new HyperliquidGateway(), []);

  useEffect(() => {
    // No wallet - clear positions
    if (!walletAddress) {
      positionStore.getState().clear();
      return;
    }

    let subscription: SubscriptionHandle | undefined;
    let isCancelled = false;

    (async () => {
      try {
        positionStore.getState().setLoading(true);

        // Subscribe to position data via Gateway
        // Gateway handles HTTP + WS hybrid strategy internally
        subscription = await gateway.subscribeWebData2(
          walletAddress,
          (data: hl.WebData2Response) => {
            // Don't process if effect was cancelled
            if (!isCancelled) {
              try {
                // Extract non-zero positions
                const positions = extractPositions(data);

                // Enrich with market data
                const enrichedPositions = enrichPositions(positions, marketAdapter);

                // Update store
                positionStore.getState().setPositions(enrichedPositions);
                positionStore.getState().setLoading(false);
              } catch (error) {
                console.error('[usePositionSubscription] Failed to process position data:', error);
                positionStore.getState().setLoading(false);
              }
            }
          },
        );
      } catch (error) {
        console.error('[usePositionSubscription] Failed to start subscription:', error);
        if (!isCancelled) {
          positionStore.getState().setLoading(false);
        }
      }
    })();

    // Cleanup function
    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
      positionStore.getState().clear();
    };
  }, [walletAddress, gateway, marketAdapter]);
}
