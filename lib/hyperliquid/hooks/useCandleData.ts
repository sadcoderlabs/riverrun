import { useCallback, useEffect, useState } from 'react';
import * as infoClient from '../client/infoClient';

/**
 * Candle interval type
 */
export type CandleInterval =
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

/**
 * Candle data structure from Hyperliquid
 */
export interface CandleData {
  /** Start time in milliseconds */
  t: number;
  /** End time in milliseconds */
  T: number;
  /** Symbol (e.g., "BTC") */
  s: string;
  /** Interval */
  i: string;
  /** Open price */
  o: string;
  /** Close price */
  c: string;
  /** High price */
  h: string;
  /** Low price */
  l: string;
  /** Volume */
  v: string;
  /** Number of trades */
  n: number;
}

/**
 * Formatted candle data for lightweight-charts
 */
export interface FormattedCandleData {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface UseCandleDataOptions {
  /** Coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Candle interval */
  interval: CandleInterval;
  /** Start time in milliseconds. Defaults to 24 hours ago */
  startTime?: number;
  /** End time in milliseconds. Defaults to now */
  endTime?: number;
  /** Auto-refresh interval in milliseconds. If not provided, data won't auto-refresh */
  refreshInterval?: number;
}

interface UseCandleDataResult {
  /** Formatted candle data for lightweight-charts */
  data: FormattedCandleData[];
  /** Raw candle data from Hyperliquid */
  rawData: CandleData[];
  /** Loading state */
  loading: boolean;
  /** Error message if any */
  error: string | null;
  /** Manually refetch data */
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and manage Hyperliquid candle data
 *
 * @example
 * ```tsx
 * const { data, loading, error, refetch } = useCandleData({
 *   coin: 'BTC',
 *   interval: '1h',
 *   refreshInterval: 60000, // Refresh every minute
 * });
 * ```
 */
export function useCandleData({
  coin,
  interval,
  startTime,
  endTime,
  refreshInterval,
}: UseCandleDataOptions): UseCandleDataResult {
  const [data, setData] = useState<FormattedCandleData[]>([]);
  const [rawData, setRawData] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Format raw candle data to lightweight-charts format
   */
  const formatCandleData = useCallback((candles: CandleData[]): FormattedCandleData[] => {
    return candles.map(candle => ({
      time: Math.floor(candle.t / 1000), // Convert milliseconds to seconds
      open: parseFloat(candle.o),
      high: parseFloat(candle.h),
      low: parseFloat(candle.l),
      close: parseFloat(candle.c),
      volume: parseFloat(candle.v),
    }));
  }, []);

  /**
   * Fetch candle data from Hyperliquid
   */
  const fetchCandleData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Default to 24 hours ago if startTime not provided
      const defaultStartTime = startTime || Date.now() - 24 * 60 * 60 * 1000;

      const candles = await infoClient.candleSnapshot({
        coin,
        interval,
        startTime: defaultStartTime,
        endTime,
      });

      setRawData(candles);
      setData(formatCandleData(candles));
    } catch (err) {
      console.error('Failed to fetch candle data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch candle data');
    } finally {
      setLoading(false);
    }
  }, [coin, interval, startTime, endTime, formatCandleData]);

  // Initial fetch
  useEffect(() => {
    fetchCandleData();
  }, [fetchCandleData]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const timer = setInterval(() => {
      fetchCandleData();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, fetchCandleData]);

  return {
    data,
    rawData,
    loading,
    error,
    refetch: fetchCandleData,
  };
}
