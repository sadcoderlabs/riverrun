import { useQuery } from '@tanstack/react-query';
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

interface UseCandleSnapshotParams {
  /** Coin symbol (e.g., "BTC", "ETH") */
  coin: string;
  /** Candle interval */
  interval: CandleInterval;
  /** Start time in milliseconds. Defaults to 24 hours ago */
  startTime?: number;
  /** End time in milliseconds. Defaults to now */
  endTime?: number;
}

interface UseCandleSnapshotResult {
  /** Raw candle data from Hyperliquid */
  data: CandleData[] | undefined;
  /** Loading state */
  isLoading: boolean;
  /** Error */
  error: Error | null;
  /** Manually refetch data */
  refetch: () => void;
}

/**
 * Hook to fetch Hyperliquid candle snapshot data
 *
 * Direct wrapper around infoClient.candleSnapshot() using TanStack Query.
 * Returns raw candle data from Hyperliquid API.
 *
 * @example
 * ```tsx
 * const { data, isLoading, error, refetch } = useCandleSnapshot({
 *   coin: 'BTC',
 *   interval: '1h',
 * });
 * ```
 */
export function useCandleSnapshot({
  coin,
  interval,
  startTime,
  endTime,
}: UseCandleSnapshotParams): UseCandleSnapshotResult {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['candleSnapshot', coin, interval, startTime, endTime],
    queryFn: async () => {
      // Default to 24 hours ago if startTime not provided
      const defaultStartTime = startTime || Date.now() - 24 * 60 * 60 * 1000;

      return await infoClient.candleSnapshot({
        coin,
        interval,
        startTime: defaultStartTime,
        endTime,
      });
    },
    enabled: !!coin && !!interval,
  });

  return {
    data,
    isLoading,
    error: error as Error | null,
    refetch,
  };
}
