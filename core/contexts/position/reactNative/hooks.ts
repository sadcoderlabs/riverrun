/**
 * Position React Hooks
 *
 * Convenience hooks for accessing position data in React components.
 * These hooks provide direct access to position store and utility calculations.
 */

import { useStore } from 'zustand';
import { positionStore } from '../adapters/positionStore';
import type { EnrichedPosition, PositionMetrics } from '../ports/types';

/**
 * Hook to get all positions (reactive)
 *
 * @returns Array of enriched positions
 */
export function usePositions(): EnrichedPosition[] {
  return useStore(positionStore, state => state.positions);
}

/**
 * Hook to get position count (reactive)
 *
 * @returns Number of open positions
 */
export function usePositionCount(): number {
  return useStore(positionStore, state => state.positionCount);
}

/**
 * Hook to get loading state (reactive)
 *
 * @returns Whether positions are being loaded
 */
export function usePositionsLoading(): boolean {
  return useStore(positionStore, state => state.isLoading);
}

/**
 * Hook to get current position for a specific coin (reactive)
 *
 * @param coin - Coin symbol (e.g., 'BTC', 'ETH')
 * @returns Position size (positive for long, negative for short, 0 if no position)
 */
export function useCurrentPosition(coin: string): number {
  const positions = usePositions();
  const position = positions.find(p => p.coin === coin);
  return position ? Number(position.szi) : 0;
}

/**
 * Hook to calculate position metrics
 *
 * @param position - Position to calculate metrics for
 * @returns Position metrics
 */
export function usePositionMetrics(position: EnrichedPosition): PositionMetrics {
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
