import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useSubscription, type WebData2Data } from '../subscription';
import { useCallback, useMemo, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as infoClient from '../client/infoClient';

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
 * Hook to subscribe to Hyperliquid's webData2 for comprehensive real-time account data
 *
 * Architecture:
 * - TanStack Query: Handles HTTP fetch with automatic deduplication and caching
 * - WebSocket Subscription: Provides real-time updates
 * - Manual Merging: Prefers WebSocket data when available, falls back to HTTP
 *
 * Features:
 * - Request deduplication: Multiple components share one HTTP request
 * - Global rate limiting: All HTTP requests respect 1200 weight/min limit
 * - Real-time updates: WebSocket provides incremental updates
 * - Smart caching: Reduces unnecessary API calls
 *
 * IMPORTANT: This hook safely handles accounts with no positions.
 * When an account has no spot positions, the API may not return the `spotState` field at all.
 * In such cases, the spot account value will be 0, and calculations will still work correctly.
 */
export function useWebData2(): UseWebData2Result {
  const { wallet } = useActiveWallet();
  const [mergedData, setMergedData] = useState<WebData2Data | undefined>();

  // Step 1: HTTP fetch initial data using TanStack Query
  const {
    data: httpData,
    isLoading: isHttpLoading,
    error: httpError,
  } = useQuery({
    queryKey: ['webData2', wallet?.address],
    queryFn: async () => {
      if (!wallet) return null;
      return (await infoClient.webData2({ user: wallet.address })) as WebData2Data;
    },
    enabled: !!wallet,
  });

  // Initialize with HTTP data
  useEffect(() => {
    if (httpData) {
      setMergedData(httpData);
    }
  }, [httpData]);

  // Step 2: WebSocket subscription for real-time updates
  const { data: wsData } = useSubscription<WebData2Data>(
    'webData2',
    wallet ? { user: wallet.address } : undefined,
  );

  // Step 3: Prefer WebSocket data when available
  useEffect(() => {
    if (wsData) {
      setMergedData(wsData);
    }
  }, [wsData]);

  // Use merged data for calculations
  const data = mergedData;

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
      isLoading: isHttpLoading,
      error: httpError || undefined,
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
      isHttpLoading,
      httpError,
    ],
  );
}
