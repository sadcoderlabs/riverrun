import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHyperliquidClient } from './useHyperliquidClient';

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
  const { address, isConnected } = useAppKitAccount();
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
    if (!isConnected || !address || !coin) {
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
              // Map the data to our interface
              const mappedData: ActiveAssetData = {
                user: assetData.user,
                coin: assetData.coin,
                leverage: {
                  type: assetData.leverage.type,
                  value: assetData.leverage.value,
                  rawUsd:
                    assetData.leverage.type === 'isolated' ? assetData.leverage.rawUsd : undefined,
                },
                maxTradeSzs: assetData.maxTradeSzs,
                availableToTrade: assetData.availableToTrade,
                markPx: assetData.markPx,
              };
              setData(mappedData);
              setIsLoading(false);
            }
          },
        );

        subscriptionRef.current = subscription;
      } catch (err) {
        if (isMounted) {
          console.error('Error setting up activeAssetData subscription:', err);
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
  }, [address, coin, isConnected, cleanup, getSubscriptionClient]);

  return {
    data,
    isLoading,
    error,
  };
}
