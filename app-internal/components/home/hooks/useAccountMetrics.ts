import { useCallback, useMemo } from 'react';
import { useWebData2 } from '@/infra/hyperliquid/hooks/useWebData2';
import { useWebData3 } from '@/infra/hyperliquid/hooks/useWebData3';
import type { WebData2Data, WebData3Data } from '@/infra/hyperliquid/subscription';

// Type aliases for webData responses
type SpotBalance = NonNullable<WebData2Data['spotState']>['balances'][number];
type DexState = WebData3Data['perpDexStates'][number];
type AssetPosition = NonNullable<DexState['clearinghouseState']>['assetPositions'][number];

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
 * Uses both webData2 and webData3 for complete account metrics:
 * - webData2: Spot balances (spotState)
 * - webData3: Perp metrics across ALL DEXs (validator perps + HIP-3)
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
  // webData2 for spot balances
  const { data: webData2, isLoading: isLoadingWebData2, error: errorWebData2 } = useWebData2();
  // webData3 for perp metrics across ALL DEXs (including HIP-3)
  const { data: webData3, isLoading: isLoadingWebData3, error: errorWebData3 } = useWebData3();

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
   * Calculate perp account value from webData3 (includes ALL DEXs)
   * Sum accountValue from all perpDexStates
   */
  const perpAccountValue = useMemo(() => {
    if (!webData3?.perpDexStates) return undefined;

    return webData3.perpDexStates.reduce((sum: number, dexState: DexState) => {
      const accountValue = dexState.clearinghouseState?.marginSummary?.accountValue;
      return sum + (accountValue ? parseFloat(accountValue) : 0);
    }, 0);
  }, [webData3?.perpDexStates]);

  // Calculate spot account value from webData2
  const spotAccountValue = webData2 ? calculateSpotValue(webData2.spotState?.balances) : undefined;

  const totalAccountValue =
    perpAccountValue !== undefined && spotAccountValue !== undefined
      ? perpAccountValue + spotAccountValue
      : undefined;

  /**
   * Calculate unrealized PnL from webData3 (includes ALL DEXs)
   * Sum unrealizedPnl from all positions across all perpDexStates
   */
  const unrealizedPnl = useMemo(() => {
    if (!webData3?.perpDexStates) return undefined;

    return webData3.perpDexStates.reduce((total: number, dexState: DexState) => {
      const positions = dexState.clearinghouseState?.assetPositions || [];
      const dexPnl = positions.reduce((sum: number, asset: AssetPosition) => {
        return sum + parseFloat(asset.position.unrealizedPnl);
      }, 0);
      return total + dexPnl;
    }, 0);
  }, [webData3?.perpDexStates]);

  // Balance = perpAccountValue - unrealizedPnl
  const perpBalance =
    perpAccountValue !== undefined && unrealizedPnl !== undefined
      ? perpAccountValue - unrealizedPnl
      : undefined;

  /**
   * Calculate maintenance margin from webData3 (includes ALL DEXs)
   * Sum crossMaintenanceMarginUsed from all perpDexStates
   */
  const maintenanceMargin = useMemo(() => {
    if (!webData3?.perpDexStates) return undefined;

    return webData3.perpDexStates.reduce((sum: number, dexState: DexState) => {
      const margin = dexState.clearinghouseState?.crossMaintenanceMarginUsed;
      return sum + (margin ? parseFloat(margin) : 0);
    }, 0);
  }, [webData3?.perpDexStates]);

  const crossMarginRatio =
    maintenanceMargin !== undefined && perpAccountValue
      ? (maintenanceMargin / perpAccountValue) * 100
      : undefined;

  /**
   * Calculate total notional position from webData3 (includes ALL DEXs)
   * Sum totalNtlPos from all perpDexStates
   */
  const totalNtlPos = useMemo(() => {
    if (!webData3?.perpDexStates) return undefined;

    return webData3.perpDexStates.reduce((sum: number, dexState: DexState) => {
      const ntlPos = dexState.clearinghouseState?.marginSummary?.totalNtlPos;
      return sum + (ntlPos ? Math.abs(parseFloat(ntlPos)) : 0);
    }, 0);
  }, [webData3?.perpDexStates]);

  const crossAccountLeverage =
    totalNtlPos !== undefined && perpAccountValue ? totalNtlPos / perpAccountValue : undefined;

  const isLoading = isLoadingWebData2 || isLoadingWebData3;
  const error = errorWebData2 || errorWebData3;

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
