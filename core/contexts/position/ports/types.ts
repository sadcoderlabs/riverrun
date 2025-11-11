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
