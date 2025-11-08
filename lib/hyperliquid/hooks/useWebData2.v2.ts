/**
 * Hook to subscribe to Hyperliquid's webData2 WebSocket feed using unified subscription system
 *
 * NEW VERSION (Phase 2): Uses unified subscription system
 * - Replaces custom subscription logic with useSubscription
 * - Maintains same API for backward compatibility
 * - Preserves all data transformation and calculation logic
 *
 * This hook provides comprehensive real-time account data including both perpetual and spot trading.
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import * as hl from '@nktkas/hyperliquid';
import { useCallback, useMemo } from 'react';
import { useSubscription } from '../subscription';

// Use the actual types from the SDK
type WebData2Response = hl.WebData2Response;

export interface UseWebData2Result {
  data: WebData2Response | undefined;
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
 * Helper function to calculate spot account value from balances.
 *
 * NOTE: When an account has no spot positions, the API may not include
 * the `spotState` field at all, or `spotState.balances` may be undefined.
 * This function safely handles undefined balances by returning 0.
 *
 * @param balances - Optional array of spot balances from webData2 response
 * @returns Total spot account value in USD
 */
function calculateSpotValue(balances?: WebData2Response['spotState']['balances']): number {
  // Return 0 for empty accounts (no spot positions)
  if (!balances || balances.length === 0) {
    return 0;
  }

  // Sum up all spot balances
  // For simplicity, we use the total balance value
  // You may want to multiply by current prices for accurate USD value
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
}

export function useWebData2(): UseWebData2Result {
  const { wallet } = useActiveWallet();

  // Subscribe using unified subscription system
  const { data, isLoading, error } = useSubscription<WebData2Response>('webData2', {
    user: wallet?.address,
  });

  // Memoize spot value calculation
  const spotAccountValue = useMemo(() => {
    if (!data) return undefined;
    return calculateSpotValue(data.spotState?.balances);
  }, [data]);

  // Calculate all derived values
  const perpAccountValue = useMemo(() => {
    return data?.clearinghouseState?.marginSummary?.accountValue
      ? parseFloat(data.clearinghouseState.marginSummary.accountValue)
      : undefined;
  }, [data]);

  const totalAccountValue = useMemo(() => {
    return perpAccountValue !== undefined && spotAccountValue !== undefined
      ? perpAccountValue + spotAccountValue
      : undefined;
  }, [perpAccountValue, spotAccountValue]);

  const unrealizedPnl = useMemo(() => {
    return data?.clearinghouseState?.assetPositions
      ? data.clearinghouseState.assetPositions.reduce((sum, asset) => {
          return sum + parseFloat(asset.position.unrealizedPnl);
        }, 0)
      : undefined;
  }, [data]);

  // Balance = Total Net transfers + Total realized Pnl + Total net funding fee
  // This is perpAccountValue - unrealizedPnl (because perpAccountValue includes unrealized PnL)
  const perpBalance = useMemo(() => {
    return perpAccountValue !== undefined && unrealizedPnl !== undefined
      ? perpAccountValue - unrealizedPnl
      : undefined;
  }, [perpAccountValue, unrealizedPnl]);

  // Cross Margin Ratio = Maintenance Margin / Portfolio Value
  const maintenanceMargin = useMemo(() => {
    return data?.clearinghouseState?.crossMaintenanceMarginUsed
      ? parseFloat(data.clearinghouseState.crossMaintenanceMarginUsed)
      : undefined;
  }, [data]);

  const crossMarginRatio = useMemo(() => {
    return maintenanceMargin !== undefined && perpAccountValue
      ? (maintenanceMargin / perpAccountValue) * 100
      : undefined;
  }, [maintenanceMargin, perpAccountValue]);

  const crossAccountLeverage = useMemo(() => {
    return data?.clearinghouseState?.marginSummary?.totalNtlPos && perpAccountValue
      ? Math.abs(parseFloat(data.clearinghouseState.marginSummary.totalNtlPos)) / perpAccountValue
      : undefined;
  }, [data, perpAccountValue]);

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
