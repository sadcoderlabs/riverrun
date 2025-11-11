/**
 * Position React Hooks
 *
 * Convenience hooks for accessing position data in React components.
 * These hooks combine the position service with Zustand store for reactivity.
 */

import { useStore } from 'zustand';
import { usePositionContext } from './usePositionContext';
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
  const { positionService } = usePositionContext();
  const positions = usePositions();

  // Re-calculate when positions change
  return positionService.getCurrentPosition(coin);
}

/**
 * Hook to calculate position metrics
 *
 * @param position - Position to calculate metrics for
 * @returns Position metrics
 */
export function usePositionMetrics(position: EnrichedPosition): PositionMetrics {
  const { positionService } = usePositionContext();

  // Calculate metrics on each render (cheap calculation)
  return positionService.calculateMetrics(position);
}
