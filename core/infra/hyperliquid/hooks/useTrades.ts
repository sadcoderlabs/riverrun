/**
 * Hook to subscribe to Hyperliquid's trades WebSocket feed
 * for real-time trade updates.
 *
 * Architecture:
 * - Uses unified subscription system for WebSocket management
 * - Maintains rolling list of recent trades (up to last 10)
 * - Use with useLatestPrice to derive latest price and direction
 *
 * Features:
 * - Automatic subscription management (subscribe/unsubscribe)
 * - Shared subscriptions (multiple components share one WebSocket)
 * - App lifecycle integration (pause/resume)
 */

import { useEffect, useState } from 'react';
import { useSubscription, type Trade, type TradesData } from '../subscription';

interface UseTradesParams {
  coin: string;
}

interface UseTradesResult {
  /** All recent trades (up to last 10) */
  trades: Trade[];
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to trades WebSocket feed
 *
 * @example
 * ```typescript
 * const { trades, isLoading } = useTrades({ coin: 'BTC' });
 * ```
 */
export function useTrades({ coin }: UseTradesParams): UseTradesResult {
  const [trades, setTrades] = useState<Trade[]>([]);

  // Reset trades array when coin changes to prevent stale data from previous market
  useEffect(() => {
    setTrades([]);
  }, [coin]);

  // Subscribe to trades WebSocket via unified subscription system
  const {
    data: wsData,
    isLoading,
    error,
  } = useSubscription<TradesData>('trades', coin ? { coin } : undefined);

  // Merge new trades with existing trades, keeping last 10
  useEffect(() => {
    if (wsData?.trades && wsData.trades.length > 0) {
      setTrades(prevTrades => {
        const newTrades = [...prevTrades, ...wsData.trades].slice(-10);
        return newTrades;
      });
    }
  }, [wsData]);

  return {
    trades,
    isLoading,
    error,
  };
}

// Re-export Trade type for convenience
export type { Trade } from '../subscription';
