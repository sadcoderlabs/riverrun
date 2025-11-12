import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  useCandleSnapshot,
  type CandleData,
  type CandleInterval,
} from '@/core/infra/hyperliquid/hooks/useCandleSnapshot';

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
 * Format raw candle data to lightweight-charts format
 */
function formatCandleData(candles: CandleData[]): FormattedCandleData[] {
  return candles.map(candle => ({
    time: Math.floor(candle.t / 1000), // Convert milliseconds to seconds
    open: parseFloat(candle.o),
    high: parseFloat(candle.h),
    low: parseFloat(candle.l),
    close: parseFloat(candle.c),
    volume: parseFloat(candle.v),
  }));
}

/**
 * Hook to fetch and manage Hyperliquid candle data with formatting and auto-refresh
 *
 * Built on top of useCandleSnapshot, this hook provides:
 * - Formatted data for lightweight-charts
 * - Auto-refresh capability
 * - Error handling
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
  // Fetch raw candle data
  const {
    data: rawData,
    isLoading,
    error: queryError,
    refetch,
  } = useCandleSnapshot({
    coin,
    interval,
    startTime,
    endTime,
  });

  // Format candle data for lightweight-charts
  const formattedData = useMemo(() => {
    if (!rawData || rawData.length === 0) return [];
    return formatCandleData(rawData);
  }, [rawData]);

  // Auto-refresh
  useEffect(() => {
    if (!refreshInterval) return;

    const timer = setInterval(() => {
      refetch();
    }, refreshInterval);

    return () => clearInterval(timer);
  }, [refreshInterval, refetch]);

  // Wrap refetch to match the async signature
  const wrappedRefetch = useCallback(async () => {
    refetch();
  }, [refetch]);

  return {
    data: formattedData,
    rawData: rawData || [],
    loading: isLoading,
    error: queryError?.message || null,
    refetch: wrappedRefetch,
  };
}

// Re-export types for convenience
export type { CandleData, CandleInterval };
