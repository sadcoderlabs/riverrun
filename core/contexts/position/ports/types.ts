/**
 * Position Domain Types
 *
 * Types for the position bounded context.
 */

import type * as hl from '@nktkas/hyperliquid';

/**
 * Base position type from Hyperliquid SDK
 */
export type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

/**
 * Enriched position with market data
 */
export interface EnrichedPosition extends Position {
  /** Current mark price from market data */
  markPx: string;
  /** Size decimals for the asset */
  szDecimals: number;
}

/**
 * Position metrics for display
 */
export interface PositionMetrics {
  /** Adjusted funding (inverted for Long positions) */
  funding: number;
  /** Whether funding is positive (user receives) */
  isFundingPositive: boolean;
  /** Position side */
  side: 'Long' | 'Short';
  /** Whether unrealized PnL is positive */
  isPnlPositive: boolean;
}

/**
 * Position state for store
 */
export interface PositionState {
  /** List of enriched positions */
  positions: EnrichedPosition[];
  /** Whether positions are being loaded */
  isLoading: boolean;
}

/**
 * Calculate position metrics
 *
 * Pure function to calculate display metrics from position data.
 *
 * @param position - Position to calculate metrics for
 * @returns Position metrics
 */
export function calculatePositionMetrics(position: EnrichedPosition): PositionMetrics {
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
