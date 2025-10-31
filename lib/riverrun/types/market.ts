/**
 * Market data type used throughout the application
 */
export type Market = {
  /** Market identifier (e.g., "BTC-USD" for perpetuals) */
  id: string;
  /** Display name (same as id for now) */
  name: string;
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
};
