/**
 * usePositionSubscription - Manages real-time position data subscriptions
 *
 * This hook automatically:
 * - Monitors active wallet changes
 * - Gets positions from ALL DEXs (validator perps + HIP-3) via useMultiDexClearinghouse
 * - Enriches positions with market data (markPx, szDecimals)
 * - Updates position store with enriched data
 *
 * Design: React Hook for subscription management
 * - Embraces React lifecycle (useEffect)
 * - Manages subscriptions automatically
 * - Updates positionStore directly
 *
 * Note: Uses useMultiDexClearinghouse which queries all DEXs in parallel.
 */

import { useEffect } from 'react';

import { useWallet } from '../../wallet/hooks/useWallet';
import { useMultiDexClearinghouse } from '@/infra/hyperliquid/hooks/useMultiDexClearinghouse';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { TelemetryPort } from '@/contexts/telemetry/ports/telemetryPort';
import { positionStore } from '../adapters/positionStore';
import type { EnrichedPosition, Position } from '../types/position';

// ============================================================================
// Data Processing Functions (Testable)
// ============================================================================

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
export function usePositionSubscription(
  marketAdapter: MarketPort,
  telemetryService: TelemetryPort,
) {
  // Get active wallet address from useWallet hook
  const { address: walletAddress } = useWallet();

  // Get positions from all DEXs (validator perps + HIP-3)
  const { data: multiDexData, isLoading, error } = useMultiDexClearinghouse();

  // Update position store when multi-DEX data changes
  useEffect(() => {
    // No wallet - clear positions
    if (!walletAddress) {
      positionStore.getState().clear();
      return;
    }

    // Set loading state
    if (isLoading) {
      positionStore.getState().setLoading(true);
      return;
    }

    // Handle error
    if (error) {
      console.error('[usePositionSubscription] Error fetching positions:', error);
      telemetryService.captureError(error, {
        component: 'usePositionSubscription',
        action: 'fetchPositions',
        extra: { walletAddress },
      });
      positionStore.getState().setLoading(false);
      return;
    }

    // Process positions from multi-DEX data
    if (multiDexData) {
      try {
        // Convert aggregated positions to Position type
        const positions: Position[] = multiDexData.allPositions.map(({ position }) => position);

        // Enrich with market data
        const enrichedPositions = enrichPositions(positions, marketAdapter);

        // Update store
        positionStore.getState().setPositions(enrichedPositions);
        positionStore.getState().setLoading(false);
      } catch (err) {
        console.error('[usePositionSubscription] Failed to process position data:', err);
        telemetryService.captureError(err, {
          component: 'usePositionSubscription',
          action: 'processPositionData',
          extra: { walletAddress },
        });
        positionStore.getState().setLoading(false);
      }
    }
  }, [walletAddress, multiDexData, isLoading, error, marketAdapter, telemetryService]);

  // Clear positions when wallet disconnects
  useEffect(() => {
    if (!walletAddress) {
      positionStore.getState().clear();
    }
  }, [walletAddress]);
}
