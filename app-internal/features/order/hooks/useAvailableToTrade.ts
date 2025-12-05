/**
 * useAvailableToTrade - Get real-time available margin for trading
 *
 * Provides separate values for long and short positions based on the user's
 * current margin availability from Hyperliquid's activeAssetData feed.
 *
 * For HIP-3 assets, automatically enables DEX abstraction to show the
 * abstracted balance from main perps account.
 */

import { useAccountMetrics } from '@/app-internal/components/home/hooks/useAccountMetrics';
import { useActiveAssetData } from '@/infra/hyperliquid/hooks/useActiveAssetData';
import { useEffect, useMemo } from 'react';
import { useEnableDexAbstraction } from './useEnableDexAbstraction';

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
  // Get perp balance to check if user has funds
  const { perpBalance } = useAccountMetrics();

  // Enable DEX abstraction for HIP-3 assets (shows loading while enabling)
  const { isEnabling: isEnablingDexAbstraction, enable: enableDexAbstraction } =
    useEnableDexAbstraction();

  // Detect HIP-3 assets (format: "dex:SYMBOL", e.g., "xyz:NVDA")
  const isHip3 = coin.includes(':');

  // Enable DEX abstraction when viewing HIP-3 assets with perp balance
  useEffect(() => {
    if (isHip3 && perpBalance !== undefined && perpBalance > 0) {
      enableDexAbstraction();
    }
  }, [isHip3, perpBalance, enableDexAbstraction]);

  // Subscribe to active asset data for real-time margin updates
  const { data: activeAssetData, isLoading: isLoadingData, error } = useActiveAssetData({ coin });

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

  // Show loading while enabling DEX abstraction OR loading data
  const isLoading = isEnablingDexAbstraction || isLoadingData;

  return {
    longAvailableToTrade,
    shortAvailableToTrade,
    isLoading,
    error,
  };
}
