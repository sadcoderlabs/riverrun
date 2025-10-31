import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHyperliquidClient } from './useHyperliquidClient';
import { useActiveWallet } from './useActiveWallet';

export interface ActiveAssetData {
  user: string;
  coin: string;
  leverage: {
    type: 'isolated' | 'cross';
    value: number;
    rawUsd?: string;
  };
  maxTradeSzs: [string, string];
  availableToTrade: [string, string];
  markPx: string;
}

interface UseActiveAssetDataParams {
  coin: string;
}

interface UseActiveAssetDataResult {
  data: ActiveAssetData | undefined;
  isLoading: boolean;
  error: Error | undefined;
}

/**
 * Hook to subscribe to Hyperliquid's activeAssetData WebSocket feed
 * for real-time leverage and margin mode updates.
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { address, isAuthenticated } = useActiveWallet();
  const { getSubscriptionClient } = useHyperliquidClient();
  const [data, setData] = useState<ActiveAssetData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);

  // Cleanup function
  const cleanup = useCallback(async () => {
    if (subscriptionRef.current) {
      try {
        await subscriptionRef.current.unsubscribe();
      } catch (err) {
        console.error('Error unsubscribing from activeAssetData:', err);
      }
      subscriptionRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if conditions aren't met
    if (!isAuthenticated || !address || !coin) {
      if (!address && isAuthenticated) {
        console.warn('[useActiveAssetData] Wallet authenticated but address not available');
      }
      setIsLoading(false);
      setData(undefined);
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);

    const setupSubscription = async () => {
      try {
        // Cleanup any existing subscription
        await cleanup();

        // Get subscription client from hook
        const subscriptionClient = getSubscriptionClient();

        // Subscribe to activeAssetData
        const subscription = await subscriptionClient.activeAssetData(
          {
            coin: coin.toUpperCase(),
            user: address,
          },
          assetData => {
            if (isMounted) {
              setData(assetData);
              setIsLoading(false);
            }
          },
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('[useActiveAssetData] Error setting up subscription:', err);
          setError(err instanceof Error ? err : new Error('Failed to subscribe'));
          setIsLoading(false);
        }
      }
    };

    void setupSubscription();

    // Cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
      void cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, coin, isAuthenticated]);

  return {
    data,
    isLoading,
    error,
  };
}
