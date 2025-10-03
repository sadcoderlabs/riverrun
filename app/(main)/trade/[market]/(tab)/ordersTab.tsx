import { OrderItem } from '@/components/global/order-item';
import {
  ApprovalGateProvider,
  useApprovalGate,
} from '@/components/hyperliquid/ApprovalGateProvider';
import { GateButton } from '@/components/hyperliquid/GateButton';
import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

const formatNumber = (value: number | string, decimals = 4) => {
  const numericValue = typeof value === 'string' ? parseFloat(value) : value;
  if (Number.isNaN(numericValue)) {
    return '-';
  }

  return numericValue.toFixed(decimals);
};

const formatTimestamp = (timestamp: number) => {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

const formatSide = (side: string) => {
  const normalized = side?.toUpperCase();
  if (normalized === 'B' || normalized === 'BUY') {
    return 'Buy';
  }

  if (normalized === 'A' || normalized === 'SELL' || normalized === 'S') {
    return 'Sell';
  }

  return side;
};

export function OrdersTabContent() {
  const { address, isConnected } = useAppKitAccount();
  const { infoClient, walletProvider } = useApprovalGate();

  const [orders, setOrders] = useState<hl.OpenOrdersResponse>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);
  const [cancelError, setCancelError] = useState<string | undefined>(undefined);
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});

  type MetaUniverse = Awaited<ReturnType<hl.InfoClient['meta']>>['universe'];
  const [metaUniverse, setMetaUniverse] = useState<MetaUniverse | undefined>(undefined);

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

        const userOpenOrders = await infoClient.openOrders({ user: address });
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
    [address, infoClient],
  );

  const fetchMeta = useCallback(async () => {
    if (metaUniverse) {
      return;
    }

    try {
      const meta = await infoClient.meta();
      setMetaUniverse(meta.universe);
    } catch (err) {
      console.error('Error fetching meta data:', err);
    }
  }, [infoClient, metaUniverse]);

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
          {sortedOrders.map(order => {
            const price = parseFloat(order.limitPx);
            const size = parseFloat(order.sz);
            const orderValue = Number.isFinite(price * size) ? (price * size).toFixed(2) : '-';
            const isBuy = order.side?.toUpperCase() === 'B' || order.side?.toUpperCase() === 'BUY';

            return (
              <YStack
                key={order.oid}
                backgroundColor="$background"
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius="$2"
                padding="$3"
                gap="$2"
              >
                <XStack justifyContent="space-between" alignItems="center">
                  <Text fontSize="$5" fontFamily="$interSemiBold">
                    {order.coin}
                  </Text>
                  <Text color={isBuy ? '$green10' : '$red10'} fontFamily="$interSemiBold">
                    {formatSide(order.side)}
                  </Text>
                </XStack>

                <YStack gap="$1">
                  <XStack justifyContent="space-between">
                    <Text color="$color11">Order ID</Text>
                    <Text fontFamily="$interMedium">{order.oid}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text color="$color11">Price</Text>
                    <Text fontFamily="$interMedium">${formatNumber(order.limitPx)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text color="$color11">Size</Text>
                    <Text fontFamily="$interMedium">{formatNumber(order.sz)}</Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text color="$color11">Value</Text>
                    <Text fontFamily="$interMedium">
                      {orderValue === '-' ? '-' : `$${orderValue}`}
                    </Text>
                  </XStack>

                  <XStack justifyContent="space-between">
                    <Text color="$color11">Created</Text>
                    <Text fontFamily="$interMedium">{formatTimestamp(order.timestamp)}</Text>
                  </XStack>
                </YStack>

                <XStack justifyContent="flex-end" marginTop="$2">
                  <GateButton
                    size="$3"
                    disabled={Boolean(cancelingOrderIds[order.oid]) || !walletProvider}
                    loading={Boolean(cancelingOrderIds[order.oid])}
                    loadingTitle="Canceling..."
                    title="Cancel Order"
                    onPressApproved={async context => {
                      setCancelError(undefined);
                      setCancelingOrderIds(prev => ({ ...prev, [order.oid]: true }));

                      try {
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

                        await context.agentExchangeClient.cancel({
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
                        throw err;
                      } finally {
                        setCancelingOrderIds(prev => {
                          const next = { ...prev };
                          delete next[order.oid];
                          return next;
                        });
                      }
                    }}
                  />
                </XStack>
              </YStack>
            );
          })}
        </YStack>
      </ScrollView>
    </YStack>
  );
}

export default function OrdersTab() {
  return (
    <ApprovalGateProvider>
      <OrdersTabContent />
    </ApprovalGateProvider>
  );
}
