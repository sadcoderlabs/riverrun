import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useSubscription, type WebData2Data } from '../subscription';
import { useCallback, useMemo } from 'react';

export interface UseWebData2Result {
  data: WebData2Data | undefined;
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
 * Hook to subscribe to Hyperliquid's webData2 WebSocket feed
 * for comprehensive real-time account data including both perpetual and spot trading.
 *
 * This hook uses the unified subscription system which provides:
 * - Reference counting: multiple components share one subscription
 * - Global rate limiting: prevents 429 errors
 * - Hybrid approach: fast HTTP fetch + WebSocket updates
 *
 * The totalAccountValue is calculated as:
 * perpAccountValue + spotAccountValue
 *
 * IMPORTANT: This hook safely handles accounts with no positions.
 * When an account has no spot positions, the API may not return the `spotState` field at all.
 * In such cases, the spot account value will be 0, and calculations will still work correctly.
 */
export function useWebData2(): UseWebData2Result {
  const { wallet } = useActiveWallet();

  // Subscribe using unified subscription system
  const { data, isLoading, error } = useSubscription<WebData2Data>(
    'webData2',
    wallet ? { user: wallet.address } : undefined,
  );

  /**
   * Helper function to calculate spot account value from balances.
   *
   * NOTE: When an account has no spot positions, the API may not include
   * the `spotState` field at all, or `spotState.balances` may be undefined.
   * This function safely handles undefined balances by returning 0.
   *
   * @param balances - Optional array of spot balances from webData2 response
   * @returns Total spot account value in USD
   */
  const calculateSpotValue = useCallback((balances?: WebData2Data['spotState']['balances']) => {
    // Return 0 for empty accounts (no spot positions)
    if (!balances || balances.length === 0) {
      return 0;
    }

    // Sum up all spot balances
    return balances.reduce((sum, balance) => {
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

  // Calculate account values
  const perpAccountValue = data?.clearinghouseState?.marginSummary?.accountValue
    ? parseFloat(data.clearinghouseState.marginSummary.accountValue)
    : undefined;

  // Calculate spot account value using optional chaining to handle accounts with no spot positions
  const spotAccountValue = data ? calculateSpotValue(data.spotState?.balances) : undefined;

  const totalAccountValue =
    perpAccountValue !== undefined && spotAccountValue !== undefined
      ? perpAccountValue + spotAccountValue
      : undefined;

  // Calculate Perps Overview metrics
  const unrealizedPnl = data?.clearinghouseState?.assetPositions
    ? data.clearinghouseState.assetPositions.reduce((sum, asset) => {
        return sum + parseFloat(asset.position.unrealizedPnl);
      }, 0)
    : undefined;

  // Balance = perpAccountValue - unrealizedPnl
  const perpBalance =
    perpAccountValue !== undefined && unrealizedPnl !== undefined
      ? perpAccountValue - unrealizedPnl
      : undefined;

  // Cross Margin Ratio = Maintenance Margin / Portfolio Value
  const maintenanceMargin = data?.clearinghouseState?.crossMaintenanceMarginUsed
    ? parseFloat(data.clearinghouseState.crossMaintenanceMarginUsed)
    : undefined;

  const crossMarginRatio =
    maintenanceMargin !== undefined && perpAccountValue
      ? (maintenanceMargin / perpAccountValue) * 100
      : undefined;

  const crossAccountLeverage =
    data?.clearinghouseState?.marginSummary?.totalNtlPos && perpAccountValue
      ? Math.abs(parseFloat(data.clearinghouseState.marginSummary.totalNtlPos)) / perpAccountValue
      : undefined;

  return useMemo(
    () => ({
      data,
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
      data,
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
