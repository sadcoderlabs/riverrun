/**
 * Market data type used throughout the application
 */
export type Market = {
  /** Market trading pair (e.g., "BTC-USD" for perpetuals) */
  marketPair: string;
  /** Coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Asset ID used by Hyperliquid API for order placement */
  assetId: number;
  /** Current market price */
  price: number;
  /** 24-hour price change percentage */
  change: number;
  /** Maximum leverage allowed for this market */
  maxLeverage: number;
  /** Current funding rate percentage */
  fundingRate: number;
  /** 24-hour trading volume in USD */
  volume: number;
  /** Size decimals for price formatting (from Hyperliquid meta) */
  szDecimals: number;
};
