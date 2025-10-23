import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  enabled?: boolean;
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
export function useActiveAssetData({
  coin,
  enabled = true,
}: UseActiveAssetDataParams): UseActiveAssetDataResult {
  const { address, isConnected } = useAppKitAccount();
  const [data, setData] = useState<ActiveAssetData | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>(undefined);

  const transportRef = useRef<hl.WebSocketTransport | null>(null);
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

    if (transportRef.current) {
      try {
        await transportRef.current.close();
      } catch (err) {
        console.error('Error closing WebSocket transport:', err);
      }
      transportRef.current = null;
    }
  }, []);

  useEffect(() => {
    // Don't subscribe if conditions aren't met
    if (!enabled || !isConnected || !address || !coin) {
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

        // Create WebSocket transport
        const transport = new hl.WebSocketTransport();
        transportRef.current = transport;

        // Create subscription client
        const subscriptionClient = new hl.SubscriptionClient({ transport });

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
  }, [address, coin, enabled, isConnected, cleanup]);

  return {
    data,
    isLoading,
    error,
  };
}
