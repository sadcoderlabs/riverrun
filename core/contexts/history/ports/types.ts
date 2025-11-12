/**
 * Type definitions for trading history (fills/executed trades)
 *
 * This file defines the domain types for the history context.
 * These types represent executed trades (fills) from Hyperliquid.
 */

// ============================================================================
// Basic Types
// ============================================================================

/**
 * Fill side: Buy or Sell
 * - B: Buy
 * - A: Ask (Sell)
 */
export type FillSide = 'B' | 'A';

/**
 * Trade direction including position context
 */
export type FillDirection =
  | 'Open Long'
  | 'Close Long'
  | 'Open Short'
  | 'Close Short'
  | 'Buy'
  | 'Sell';

// ============================================================================
// Fill Interfaces
// ============================================================================

/**
 * Liquidation information for a fill
 */
export interface FillLiquidation {
  /** Address of the liquidated user (optional) */
  liquidatedUser?: string;
  /** Mark price at liquidation */
  markPx: number;
  /** Liquidation method */
  method: 'market' | 'backstop';
}

/**
 * Fill (Executed Trade)
 *
 * Represents a single executed trade on Hyperliquid.
 * Contains all information about the trade including price, size, fees, and PnL.
 */
export interface Fill {
  /** Trading pair coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Fill price */
  px: string;
  /** Fill size */
  sz: string;
  /** Buy or Sell */
  side: FillSide;
  /** Timestamp in milliseconds */
  time: number;
  /** Position size before this fill */
  startPosition: string;
  /** Direction of the trade (with position context) */
  dir: FillDirection;
  /** Realized PnL from this fill */
  closedPnl: string;
  /** L1 transaction hash */
  hash: string;
  /** Order ID */
  oid: number;
  /** true = taker, false = maker */
  crossed: boolean;
  /** Total fee (negative = rebate) */
  fee: string;
  /** Trade ID (unique identifier) */
  tid: number;
  /** Fee token (e.g., "USDC") */
  feeToken: string;
  /** Optional builder fee */
  builderFee?: string;
  /** Optional client order ID */
  cloid?: string;
  /** TWAP order ID if applicable */
  twapId: number | undefined;
  /** Optional liquidation information */
  liquidation?: FillLiquidation;
}

// ============================================================================
// API Response Types (for internal use)
// ============================================================================

/**
 * Response from userFills API endpoint
 * @internal
 */
export interface UserFillsResponse {
  fills: Fill[];
}

/**
 * WebSocket fill update message
 * @internal
 */
export interface WsFillUpdate {
  /** true for initial snapshot, false for incremental updates */
  isSnapshot?: boolean;
  /** User address */
  user: string;
  /** Array of fills */
  fills: Fill[];
}
