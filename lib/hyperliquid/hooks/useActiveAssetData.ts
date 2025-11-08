import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useInfoClient } from '../client/useInfoClient';
import { useSubscriptionClient } from '../client/useSubscriptionClient';
import { useAppStateSubscriptionManager } from './useAppStateSubscriptionManager';

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
 * Hook to get Hyperliquid's activeAssetData using hybrid strategy:
 * 1. Fast initial fetch via HTTP API (100-300ms)
 * 2. Real-time updates via WebSocket subscription
 *
 * Features:
 * - AppState lifecycle management (pauses in background)
 * - Automatic cleanup and resubscription
 * - Hybrid strategy for optimal UX (fast initial load + real-time updates)
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { wallet } = useActiveWallet();
  const infoClient = useInfoClient();
  const subscriptionClient = useSubscriptionClient();
  const subscriptionState = useAppStateSubscriptionManager();
  const [data, setData] = useState<ActiveAssetData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const subscriptionRef = useRef<hl.Subscription | null>(null);
  const httpFetchedRef = useRef(false);

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
    // Don't fetch if conditions aren't met
    if (!wallet || !coin) {
      setIsLoading(false);
      setData(undefined);
      return;
    }

    // Don't subscribe if app is suspended
    if (subscriptionState === 'suspended') {
      void cleanup();
      return;
    }

    let isMounted = true;
    setIsLoading(true);
    setError(undefined);
    httpFetchedRef.current = false;

    const fetchAndSubscribe = async () => {
      try {
        // Step 1: Fast HTTP fetch for initial data
        const httpData = await infoClient.activeAssetData({
          coin: coin.toUpperCase(),
          user: wallet.address,
        });

        if (isMounted) {
          setData(httpData);
          setIsLoading(false);
          httpFetchedRef.current = true;
        }
      } catch (err) {
        console.error('[useActiveAssetData] HTTP fetch failed:', err);
        // Don't set error state, will try WebSocket
      }

      // Step 2: Set up WebSocket subscription for real-time updates
      // Only subscribe when app is active
      if (subscriptionState !== 'active') {
        return;
      }

      try {
        // Cleanup any existing subscription
        await cleanup();

        // Subscribe to activeAssetData for real-time updates
        const subscription = await subscriptionClient.activeAssetData(
          {
            coin: coin.toUpperCase(),
            user: wallet.address,
          },
          assetData => {
            if (isMounted) {
              setData(assetData);
              // If HTTP didn't return yet, WebSocket is the first result
              if (!httpFetchedRef.current) {
                setIsLoading(false);
              }
            }
          },
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('[useActiveAssetData] WebSocket subscription failed:', err);
          // Only set error if both HTTP and WebSocket failed
          if (!httpFetchedRef.current) {
            setError(err instanceof Error ? err : new Error('Failed to fetch data'));
            setIsLoading(false);
          }
        }
      }
    };

    void fetchAndSubscribe();

    // Cleanup on unmount or when dependencies change
    return () => {
      isMounted = false;
      void cleanup();
    };
  }, [wallet, coin, subscriptionState, cleanup, infoClient, subscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
