import { OrderItem } from '@/components/global/order-item';
import { setupAgentClients } from '@/lib/hyperliquid/agent';
import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount, useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, RefreshControl } from 'react-native';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

export default function OrdersTab() {
  const { address, isConnected } = useAppKitAccount();
  const { walletProvider } = useAppKitProvider();

  const [orders, setOrders] = useState<hl.OpenOrdersResponse>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [cancelError, setCancelError] = useState<string | undefined>(undefined);
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});

  type MetaUniverse = Awaited<ReturnType<hl.InfoClient['meta']>>['universe'];
  const [metaUniverse, setMetaUniverse] = useState<MetaUniverse | undefined>(undefined);

  const transportRef = useRef<hl.HttpTransport | undefined>(undefined);
  const infoClientRef = useRef<hl.InfoClient | undefined>(undefined);

  const transport = transportRef.current ?? new hl.HttpTransport();
  transportRef.current = transport;

  const infoClient = infoClientRef.current ?? new hl.InfoClient({ transport });
  infoClientRef.current = infoClient;

  const fetchOpenOrders = useCallback(
    async (isRefresh = false) => {
      if (!address) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      try {
        setError(undefined);
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const client = infoClientRef.current;
        if (!client) {
          throw new Error('Info client not initialized');
        }

        const userOpenOrders = await client.openOrders({ user: address });
        setOrders(userOpenOrders);
      } catch (err) {
        console.error('Error fetching open orders:', err);
        setError('Failed to fetch open orders');
      } finally {
        if (isRefresh) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [address],
  );

  const fetchMeta = useCallback(async () => {
    if (metaUniverse) {
      return;
    }

    const client = infoClientRef.current;
    if (!client) {
      return;
    }

    try {
      const meta = await client.meta();
      setMetaUniverse(meta.universe);
    } catch (err) {
      console.error('Error fetching meta data:', err);
    }
  }, [metaUniverse]);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    fetchOpenOrders();
  }, [address, fetchOpenOrders]);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const onRefresh = useCallback(() => {
    fetchOpenOrders(true);
  }, [fetchOpenOrders]);

  const sortedOrders = useMemo(() => {
    return [...orders].sort((a, b) => b.timestamp - a.timestamp);
  }, [orders]);

  const normalizeAssetName = useCallback((value: string) => {
    return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
  }, []);

  const handleCancelOrder = useCallback(
    async (order: hl.OpenOrdersResponse[number]) => {
      if (!walletProvider) {
        setCancelError('Wallet provider not available. Please reconnect.');
        return;
      }

      if (cancelingOrderIds[order.oid]) {
        return;
      }

      setCancelError(undefined);

      try {
        const transport = transportRef.current;
        const infoClient = infoClientRef.current;

        if (!transport || !infoClient) {
          throw new Error('Client transport not initialized');
        }

        const {
          agentExchangeClient,
          masterExchangeClient,
          agentAddress,
          agentName,
          isAgentApproved,
        } = await setupAgentClients({
          walletProvider,
          transport,
          infoClient,
          autoApprove: false,
        });

        if (!isAgentApproved) {
          const handleAgentApproval = async () => {
            try {
              await masterExchangeClient.approveAgent({
                agentAddress,
                agentName,
              });
            } catch (approveErr) {
              console.error('Error approving agent:', approveErr);
              setCancelError('Failed to initiate agent approval. Please try again.');
            }
          };

          Alert.alert(
            'Agent approval required',
            'Canceling an order requires approving the agent first. Confirm to approve now.',
            [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Confirm',
                onPress: () => {
                  void handleAgentApproval();
                },
              },
            ],
          );
          return;
        }

        setCancelingOrderIds(prev => ({ ...prev, [order.oid]: true }));

        let universe = metaUniverse;
        if (!universe) {
          const meta = await infoClient.meta();
          universe = meta.universe;
          setMetaUniverse(universe);
        }

        const normalizedCoin = normalizeAssetName(order.coin);
        const assetIndex = universe.findIndex(
          asset => normalizeAssetName(asset.name) === normalizedCoin,
        );

        if (assetIndex === -1) {
          throw new Error(`Unable to determine asset index for ${order.coin}`);
        }

        await agentExchangeClient.cancel({
          cancels: [
            {
              a: assetIndex,
              o: order.oid,
            },
          ],
        });

        await fetchOpenOrders();
      } catch (err) {
        console.error('Error canceling order:', err);
        setCancelError('Failed to cancel order. Please try again.');
      } finally {
        setCancelingOrderIds(prev => {
          const next = { ...prev };
          delete next[order.oid];
          return next;
        });
      }
    },
    [
      walletProvider,
      cancelingOrderIds,
      metaUniverse,
      normalizeAssetName,
      fetchOpenOrders,
      setMetaUniverse,
    ],
  );

  if (!isConnected || !address) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view orders</Text>
      </YStack>
    );
  }

  if (loading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2">Loading open orders...</Text>
      </YStack>
    );
  }

  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10">{error}</Text>
      </YStack>
    );
  }

  if (sortedOrders.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No open orders</Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} padding="$3" gap="$3">
      <ScrollView
        flex={1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#999" />
        }
      >
        <YStack gap="$3" paddingBottom="$4">
          {cancelError ? (
            <YStack
              borderRadius="$2"
              backgroundColor="$red4"
              borderColor="$red8"
              borderWidth={1}
              padding="$2"
            >
              <Text color="$red10" fontFamily="$interMedium">
                {cancelError}
              </Text>
            </YStack>
          ) : undefined}
          {sortedOrders.map(order => (
            <OrderItem
              key={order.oid}
              order={order}
              isCanceling={Boolean(cancelingOrderIds[order.oid])}
              onCancel={handleCancelOrder}
            />
          ))}
        </YStack>
      </ScrollView>
    </YStack>
  );
}
