import { useMemo } from 'react';
import { useActiveAssetData } from '@/core/infra/hyperliquid/hooks/useActiveAssetData';

interface UseAvailableToTradeParams {
  coin: string;
}

interface UseAvailableToTradeResult {
  /** Available margin for opening long positions (in USD) */
  longAvailableToTrade: number;
  /** Available margin for opening short positions (in USD) */
  shortAvailableToTrade: number;
  /** Loading state from activeAssetData subscription */
  isLoading: boolean;
  /** Error state from activeAssetData subscription */
  error: Error | undefined;
}

/**
 * Hook to get real-time available margin for trading
 *
 * Provides separate values for long and short positions based on the user's
 * current margin availability from Hyperliquid's activeAssetData feed.
 *
 * @param coin - Asset symbol (e.g., 'BTC', 'ETH', 'SOL')
 * @returns Object containing longAvailableToTrade, shortAvailableToTrade, loading and error states
 *
 * @example
 * ```typescript
 * const { longAvailableToTrade, shortAvailableToTrade, isLoading } = useAvailableToTrade({ coin: 'BTC' });
 *
 * // Use in order form
 * const availableMargin = orderSide === 'Long' ? longAvailableToTrade : shortAvailableToTrade;
 * ```
 */
export function useAvailableToTrade({
  coin,
}: UseAvailableToTradeParams): UseAvailableToTradeResult {
  // Subscribe to active asset data for real-time margin updates
  const { data: activeAssetData, isLoading, error } = useActiveAssetData({ coin });

  // Parse and memoize available margin values
  const { longAvailableToTrade, shortAvailableToTrade } = useMemo(() => {
    if (!activeAssetData?.availableToTrade) {
      return {
        longAvailableToTrade: 0,
        shortAvailableToTrade: 0,
      };
    }

    // availableToTrade[0] = long (buy) available margin
    // availableToTrade[1] = short (sell) available margin
    return {
      longAvailableToTrade: parseFloat(activeAssetData.availableToTrade[0] || '0'),
      shortAvailableToTrade: parseFloat(activeAssetData.availableToTrade[1] || '0'),
    };
  }, [activeAssetData]);

  return {
    longAvailableToTrade,
    shortAvailableToTrade,
    isLoading,
    error,
  };
}
