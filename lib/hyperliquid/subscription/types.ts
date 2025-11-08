/**
 * Data types for Hyperliquid subscriptions
 *
 * These types define the shape of data returned by each subscription type.
 */

import type { OrderBookLevel } from '../orderbook/orderbookPrecision';
import type { Fill } from '../types/fills';

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
