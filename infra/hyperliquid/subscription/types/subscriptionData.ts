/**
 * Data types for Hyperliquid subscriptions
 *
 * These types define the shape of data returned by each subscription type.
 */

import type { Fill } from '@/contexts/history/ports/types';
import type * as hl from '@nktkas/hyperliquid';

/**
 * nSigFigs parameter for Hyperliquid API
 * - null: Full precision (finest possible under exchange rules)
 * - 2-5: Number of significant figures to round to
 */
export type NSigFigs = 2 | 3 | 4 | 5 | null;

/**
 * Order book price level
 */
export interface OrderBookLevel {
  px: string; // Price
  sz: string; // Size
  n: number; // Number of orders
}

/**
 * Menu item representing a precision level
 */
export interface PrecisionMenuItem {
  step: number; // Price increment between adjacent rows
  label: string; // Human-readable label for UI (e.g., "0.01", "10")
  nSigFigs: NSigFigs; // Parameter to send to Hyperliquid API
}

/**
 * AllMids subscription data
 * Contains mid prices for all available coins
 */
export interface AllMidsData {
  mids: Record<string, string>;
}

/**
 * OrderBook subscription data
 * Contains bids and asks at a specific precision level
 */
export interface OrderBookData {
  coin: string;
  time: number;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
}

/**
 * UserFills subscription data
 * Contains user's fill history
 */
export interface UserFillsData {
  fills: Fill[];
}

/**
 * ActiveAssetData interface
 * Contains leverage and position info for a specific asset
 */
export interface ActiveAssetData {
  user: string;
  coin: string;
  leverage: {
    type: 'isolated' | 'cross';
    value: number;
    rawUsd?: string;
  };
  maxTradeSzs: [string, string];
  availableToTrade: [string, string];
  markPx: string;
}

/**
 * WebData2 subscription data
 * Contains comprehensive account data including positions, margin, and spot balances
 */
export type WebData2Data = hl.WebData2Response;

/**
 * WebData3 subscription data
 * Contains positions across ALL DEXs (validator perps + HIP-3)
 * Use this for position data to include HIP-3 assets like GOOGL, TSLA, etc.
 */
export type WebData3Data = hl.WsWebData3Event;

/**
 * ActiveAssetCtx subscription data
 * Contains real-time market data for a specific coin
 */
export interface ActiveAssetCtxData {
  coin: string;
  ctx: {
    markPx: string;
    funding: string;
    prevDayPx: string;
    dayNtlVlm: string;
    openInterest: string;
    midPx: string | null;
    oraclePx: string;
    premium: string | null;
    impactPxs: string[] | null;
    dayBaseVlm: string;
  };
}

/**
 * Trade data
 * Individual trade information
 */
export interface Trade {
  coin: string;
  side: 'B' | 'A'; // "B" = Bid/Buy, "A" = Ask/Sell
  px: string; // Price
  sz: string; // Size
  time: number; // Timestamp in ms
  hash: string;
  tid: number;
  users: [string, string]; // [Maker, Taker]
}

/**
 * Trades subscription data
 * Contains array of recent trades
 */
export interface TradesData {
  trades: Trade[];
}

/**
 * Order update information
 */
export interface OrderUpdate {
  order: {
    coin: string;
    side: 'B' | 'A';
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    origSz: string;
  };
  status?: string;
}

/**
 * OrderUpdates subscription data
 * Contains real-time order status changes
 */
export interface OrderUpdatesData {
  updates: OrderUpdate[];
}
