import * as hl from '@nktkas/hyperliquid';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAppStateSubscriptionManager } from './useAppStateSubscriptionManager';
import { useHyperliquidClient } from '../client/useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';

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
 *
 * Features:
 * - AppState lifecycle management (pauses in background)
 * - Automatic cleanup and resubscription
 */
export function useActiveAssetData({ coin }: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { wallet } = useActiveWallet();
  const { subscriptionClient } = useHyperliquidClient();
  const subscriptionState = useAppStateSubscriptionManager();
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

    const setupSubscription = async () => {
      // Only subscribe when app is active
      if (subscriptionState !== 'active') {
        return;
      }

      try {
        // Cleanup any existing subscription
        await cleanup();

        // Get subscription client
        

        // Subscribe to activeAssetData
        const subscription = await subscriptionClient.activeAssetData(
          {
            coin: coin.toUpperCase(),
            user: wallet.address,
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
  }, [wallet, coin, subscriptionState, cleanup, subscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
