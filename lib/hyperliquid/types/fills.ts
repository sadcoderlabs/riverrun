/**
 * Type definitions for Hyperliquid fills (executed trades)
 */

// ============================================================================
// Basic Types
// ============================================================================

export type FillSide = 'B' | 'A'; // B = Buy, A = Sell/Ask

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
  liquidatedUser?: string;
  markPx: number;
  method: 'market' | 'backstop';
}

/**
 * Fill from Hyperliquid API (userFills or userFillsByTime)
 * Represents an executed trade
 */
export interface Fill {
  coin: string; // "BTC", "ETH", or "@151" for spot
  px: string; // Fill price
  sz: string; // Fill size
  side: FillSide; // B = Buy, A = Sell/Ask
  time: number; // Timestamp in milliseconds
  startPosition: string; // Position size before fill
  dir: FillDirection; // Direction of the trade
  closedPnl: string; // Realized PnL from this fill
  hash: string; // L1 transaction hash (0x...)
  oid: number; // Order ID
  crossed: boolean; // true = taker, false = maker
  fee: string; // Total fee (negative = rebate)
  tid: number; // Trade ID
  feeToken: string; // "USDC", "UETH", etc.
  builderFee?: string; // Optional builder fee
  cloid?: string; // Optional client order ID
  twapId: number | null; // TWAP order ID if applicable
  liquidation?: FillLiquidation; // Optional liquidation info
}

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Response from userFills API endpoint
 */
export interface UserFillsResponse {
  fills: Fill[];
}

/**
 * WebSocket fill update message
 */
export interface WsFillUpdate {
  isSnapshot?: boolean; // true for initial load, false for real-time updates
  user: string; // User address
  fills: Fill[]; // Array of fills
}
