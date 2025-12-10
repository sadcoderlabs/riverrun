import { useCallback, useMemo } from 'react';
import { useWebData2 } from '@/infra/hyperliquid/hooks/useWebData2';
import { useMultiDexClearinghouse } from '@/infra/hyperliquid/hooks/useMultiDexClearinghouse';
import type { WebData2Data } from '@/infra/hyperliquid/subscription';

// Type aliases for webData responses
type SpotBalance = NonNullable<WebData2Data['spotState']>['balances'][number];

export interface UseAccountMetricsResult {
  // Account Equity
  totalAccountValue: number | undefined;
  perpAccountValue: number | undefined;
  spotAccountValue: number | undefined;
  // Perps Overview
  perpBalance: number | undefined;
  unrealizedPnl: number | undefined;
  crossMarginRatio: number | undefined;
  maintenanceMargin: number | undefined;
  crossAccountLeverage: number | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to calculate account metrics from Hyperliquid
 *
 * Uses multiple data sources for complete account metrics:
 * - useMultiDexClearinghouse: Perp account value, margin, positions from ALL DEXs (validator perps + HIP-3)
 * - webData2.spotState: Spot balances
 *
 * This ensures HIP-3 positions (GOOGL, TSLA, etc.) are included in account equity.
 *
 * IMPORTANT: This hook safely handles accounts with no positions.
 * When an account has no spot positions, the API may not return the `spotState` field at all.
 * In such cases, the spot account value will be 0, and calculations will still work correctly.
 *
 * @returns Calculated account metrics with loading and error states
 *
 * @example
 * ```typescript
 * const {
 *   totalAccountValue,
 *   perpBalance,
 *   unrealizedPnl,
 *   crossMarginRatio,
 * } = useAccountMetrics();
 * ```
 */
export function useAccountMetrics(): UseAccountMetricsResult {
  // Multi-DEX clearinghouse data for perp metrics (validator perps + HIP-3)
  const {
    data: multiDexData,
    isLoading: isLoadingMultiDex,
    error: multiDexError,
  } = useMultiDexClearinghouse();

  // webData2 for spot balances only
  const { data: webData2, isLoading: isLoadingWebData2, error: webData2Error } = useWebData2();

  const calculateSpotValue = useCallback((balances: SpotBalance[] | undefined) => {
    // Return 0 for empty accounts (no spot positions)
    if (!balances || balances.length === 0) {
      return 0;
    }

    // Sum up all spot balances
    return balances.reduce((sum: number, balance: SpotBalance) => {
      const total = parseFloat(balance.total);
      const entryNtl = parseFloat(balance.entryNtl);

      // For USDC (token 0), use total directly as it's already in USD
      // For other tokens, use entryNtl which is the USD value
      if (balance.token === 0) {
        return sum + total;
      } else {
        return sum + entryNtl;
      }
    }, 0);
  }, []);

  /**
   * Perp account value from multi-DEX data (includes HIP-3)
   */
  const perpAccountValue = multiDexData?.totalAccountValue;

  // Calculate spot account value from webData2
  const spotAccountValue = webData2 ? calculateSpotValue(webData2.spotState?.balances) : undefined;

  const totalAccountValue =
    perpAccountValue !== undefined && spotAccountValue !== undefined
      ? perpAccountValue + spotAccountValue
      : undefined;

  /**
   * Calculate unrealized PnL from all positions across all DEXs
   */
  const unrealizedPnl = useMemo(() => {
    if (!multiDexData?.allPositions) return undefined;

    return multiDexData.allPositions.reduce((sum, { position }) => {
      return sum + parseFloat(position.unrealizedPnl);
    }, 0);
  }, [multiDexData?.allPositions]);

  // Balance = perpAccountValue - unrealizedPnl
  const perpBalance =
    perpAccountValue !== undefined && unrealizedPnl !== undefined
      ? perpAccountValue - unrealizedPnl
      : undefined;

  /**
   * Maintenance margin from multi-DEX data
   */
  const maintenanceMargin = multiDexData?.totalMaintenanceMarginUsed;

  const crossMarginRatio =
    maintenanceMargin !== undefined && perpAccountValue
      ? (maintenanceMargin / perpAccountValue) * 100
      : undefined;

  /**
   * Total notional position from multi-DEX data
   */
  const totalNtlPos = multiDexData?.totalNtlPos;

  const crossAccountLeverage =
    totalNtlPos !== undefined && perpAccountValue ? totalNtlPos / perpAccountValue : undefined;

  const isLoading = isLoadingMultiDex || isLoadingWebData2;
  const error = multiDexError || webData2Error;

  return useMemo(
    () => ({
      totalAccountValue,
      perpAccountValue,
      spotAccountValue,
      perpBalance,
      unrealizedPnl,
      crossMarginRatio,
      maintenanceMargin,
      crossAccountLeverage,
      isLoading,
      error,
    }),
    [
      totalAccountValue,
      perpAccountValue,
      spotAccountValue,
      perpBalance,
      unrealizedPnl,
      crossMarginRatio,
      maintenanceMargin,
      crossAccountLeverage,
      isLoading,
      error,
    ],
  );
}
