import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useActiveWallet } from './useActiveWallet';
import { useHyperliquidClient } from './useHyperliquidClient';

// Use the actual types from the SDK
type WebData2Response = hl.WebData2Response;

interface UseWebData2Result {
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
 * Hook to subscribe to Hyperliquid's webData2 WebSocket feed
 * for comprehensive real-time account data including both perpetual and spot trading.
 *
 * This hook uses a hybrid approach:
 * 1. Fetches initial data using InfoClient on mount
 * 2. Subscribes to webData2 WebSocket for real-time updates
 *
 * The totalAccountValue is calculated as:
 * perpAccountValue + spotAccountValue
 *
 * IMPORTANT: This hook safely handles accounts with no positions.
 * When an account has no spot positions, the API may not return the `spotState` field at all.
 * In such cases, the spot account value will be 0, and calculations will still work correctly.
 */
export function useWebData2(): UseWebData2Result {
  const { address, isAuthenticated } = useActiveWallet();
  const { getSubscriptionClient, getInfoClient } = useHyperliquidClient();
  const [data, setData] = useState<WebData2Response | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

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
  const calculateSpotValue = useCallback((balances?: WebData2Response['spotState']['balances']) => {
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
  }, []);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('[useWebData2] Error unsubscribing:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    console.log('[useWebData2] Effect triggered:', {
      isAuthenticated,
      address,
      hasAddress: !!address,
    });

    // Don't subscribe if conditions aren't met
    if (!isAuthenticated || !address) {
      if (!address && isAuthenticated) {
        console.warn('[useWebData2] Wallet authenticated but address not available');
      }
      console.log('[useWebData2] Conditions not met, skipping subscription');
      setIsLoading(false);
      setData(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        console.log('[useWebData2] Setting up subscription for user:', address);

        // Cleanup any existing subscription
        await cleanup();

        // Step 1: Fetch initial data using InfoClient
        const infoClient = getInfoClient();
        console.log('[useWebData2] Fetching initial webData2...');

        const initialData = await infoClient.webData2({ user: address });
        // Use optional chaining because spotState may not exist for accounts with no spot positions
        const initialSpotValue = calculateSpotValue(initialData.spotState?.balances);

        console.log('[useWebData2] Initial data fetched:', {
          perpAccountValue: initialData.clearinghouseState.marginSummary.accountValue,
          spotAccountValue: initialSpotValue.toFixed(6),
          totalAccountValue: (
            parseFloat(initialData.clearinghouseState.marginSummary.accountValue) + initialSpotValue
          ).toFixed(6),
        });

        if (isMounted) {
          setData(initialData);
          console.log('[useWebData2] Set initial data');
        }

        // Step 2: Subscribe to webData2 WebSocket for real-time updates
        const subscriptionClient = getSubscriptionClient();
        console.log('[useWebData2] Setting up WebSocket subscription...');

        const subscription = await subscriptionClient.webData2(
          {
            user: address,
          },
          (event: hl.WsWebData2Event) => {
            // Use optional chaining because spotState may not exist for accounts with no spot positions
            const spotValue = calculateSpotValue(event.spotState?.balances);
            const perpValue = parseFloat(event.clearinghouseState.marginSummary.accountValue);

            console.log('[useWebData2] Received update:', {
              perpAccountValue: event.clearinghouseState.marginSummary.accountValue,
              spotAccountValue: spotValue.toFixed(6),
              totalAccountValue: (perpValue + spotValue).toFixed(6),
              time: event.clearinghouseState.time,
              isMounted,
            });

            if (isMounted) {
              setData(event);
              setIsLoading(false);
            }
          },
        );

        console.log('[useWebData2] WebSocket subscription successful');
        subscriptionRef.current = subscription;

        if (isMounted) {
          setIsLoading(false);
          console.log('[useWebData2] Ready to receive updates');
        }
      } catch (err) {
        if (isMounted) {
          console.error('[useWebData2] Error setting up subscription:', err);
          setError(err instanceof Error ? err : new Error('Failed to subscribe'));
          setIsLoading(false);
        }
      }
    };

    void setupSubscription();

    // Cleanup on unmount or when dependencies change
    return () => {
      console.log('[useWebData2] Cleaning up subscription');
      isMounted = false;
      void cleanup();
    };
  }, [address, isAuthenticated, cleanup, getSubscriptionClient, getInfoClient, calculateSpotValue]);

  // Calculate account values
  const perpAccountValue = data?.clearinghouseState?.marginSummary?.accountValue
    ? parseFloat(data.clearinghouseState.marginSummary.accountValue)
    : undefined;

  // Calculate spot account value using optional chaining to handle accounts with no spot positions
  // When spotState is missing or balances is undefined, calculateSpotValue returns 0
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

  // Balance = Total Net transfers + Total realized Pnl + Total net funding fee
  // This is perpAccountValue - unrealizedPnl (because perpAccountValue includes unrealized PnL)
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

  return {
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
  };
}
