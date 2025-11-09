/**
 * Data types for Hyperliquid subscriptions
 *
 * These types define the shape of data returned by each subscription type.
 */

import type { OrderBookLevel } from '@/lib/riverrun/orderbook/orderbookPrecision';
import type { Fill } from '@/lib/riverrun/history/fills';
import type * as hl from '@nktkas/hyperliquid';

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
