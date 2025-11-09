/**
 * Hook to extract latest price and direction from trades data
 *
 * This is a generic utility hook that can work with any trade data structure.
 * It extracts the most recent trade and derives price/direction information.
 */

export interface Trade {
  side: 'B' | 'A'; // "B" = Bid/Buy, "A" = Ask/Sell
  px: string; // Price
  time: number; // Timestamp in ms
  [key: string]: any; // Allow additional properties
}

export interface LatestPrice {
  /** Latest trade price */
  price: string;
  /** Trade direction: 'buy' for bid/buy, 'sell' for ask/sell */
  direction: 'buy' | 'sell';
  /** Original trade data */
  trade: Trade;
}

interface UseLatestPriceParams {
  trades: Trade[];
}

interface UseLatestPriceResult {
  /** Latest price and direction, or undefined if no trades */
  latestPrice: LatestPrice | undefined;
}

/**
 * Extract latest price and direction from trades
 *
 * @example
 * ```typescript
 * const { trades } = useTrades({ coin: 'BTC' });
 * const { latestPrice } = useLatestPrice({ trades });
 *
 * if (latestPrice) {
 *   console.log(latestPrice.price); // "50000.0"
 *   console.log(latestPrice.direction); // "buy" or "sell"
 * }
 * ```
 */
export function useLatestPrice({ trades }: UseLatestPriceParams): UseLatestPriceResult {
  if (trades.length === 0) {
    return { latestPrice: undefined };
  }

  // Get the most recent trade (last in array)
  const lastTrade = trades[trades.length - 1];

  return {
    latestPrice: {
      price: lastTrade.px,
      direction: lastTrade.side === 'B' ? 'buy' : 'sell',
      trade: lastTrade,
    },
  };
}
