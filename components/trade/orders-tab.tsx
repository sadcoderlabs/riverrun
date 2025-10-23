import { useHyperliquidClient } from '@/hooks/useHyperliquidClient';
import * as hl from '@nktkas/hyperliquid';
import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { RefreshControl } from 'react-native';
import { toast } from 'sonner-native';
import { Button, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

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
  const { getInfoClient, getAgentExchangeClient } = useHyperliquidClient();

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

        const userOpenOrders = await getInfoClient().openOrders({ user: address });
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
    [address, getInfoClient],
  );

  const fetchMeta = useCallback(async () => {
    if (metaUniverse) {
      return;
    }

    try {
      const meta = await getInfoClient().meta();
      setMetaUniverse(meta.universe);
    } catch (err) {
      console.error('Error fetching meta data:', err);
    }
  }, [getInfoClient, metaUniverse]);

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
    <YStack flex={1}>
      <ScrollView
        flex={1}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#999" />
        }
      >
        <YStack paddingBottom="$4">
          {cancelError ? (
            <YStack
              borderRadius="$2"
              backgroundColor="$red4"
              borderColor="$red8"
              borderWidth={1}
              padding="$3"
              mx="$4"
              mt="$4"
              mb="$2"
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

            // Pill badge for order side
            const PillBadge = ({ text, type }: { text: string; type: 'buy' | 'sell' }) => {
              return (
                <XStack
                  px="$2"
                  py="$1"
                  borderRadius="$5"
                  alignItems="center"
                  borderWidth={1}
                  borderColor={type === 'buy' ? '$green9' : '$red9'}
                  backgroundColor={type === 'buy' ? '$green2' : '$red2'}
                >
                  <Text fontSize="$1" color={type === 'buy' ? '$green9' : '$red9'}>
                    {text}
                  </Text>
                </XStack>
              );
            };

            return (
              <YStack
                key={order.oid}
                borderBottomWidth={1}
                borderBottomColor="$borderColor"
                px="$6"
                py="$6"
              >
                {/* First row: Symbol, Side badge and Timestamp */}
                <XStack justifyContent="space-between" alignItems="center" mb="$3">
                  <XStack gap="$2" alignItems="center">
                    <Text fontFamily="$interBold" fontSize="$3">
                      {order.coin}
                    </Text>
                    <PillBadge text={formatSide(order.side)} type={isBuy ? 'buy' : 'sell'} />
                  </XStack>
                  <Text color="$color9" fontSize="$1">
                    {formatTimestamp(order.timestamp)}
                  </Text>
                </XStack>

                {/* Second row: Order ID */}
                <XStack justifyContent="space-between" alignItems="center" mb="$2">
                  <Text color="$color9" fontSize="$2">
                    Order ID
                  </Text>
                  <Text fontSize="$2" fontFamily="$interMedium">
                    {order.oid}
                  </Text>
                </XStack>

                {/* Third row: Price */}
                <XStack justifyContent="space-between" alignItems="center" mb="$2">
                  <Text color="$color9" fontSize="$2">
                    Price
                  </Text>
                  <Text fontSize="$2" fontFamily="$interMedium">
                    ${formatNumber(order.limitPx)}
                  </Text>
                </XStack>

                {/* Fourth row: Size - only show if size > 0 */}
                {size > 0 && (
                  <XStack justifyContent="space-between" alignItems="center" mb="$2">
                    <Text color="$color9" fontSize="$2">
                      Size
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium">
                      {formatNumber(order.sz)}
                    </Text>
                  </XStack>
                )}

                {/* Fifth row: Value - only show if value > 0 */}
                {orderValue !== '-' && parseFloat(orderValue) > 0 && (
                  <XStack justifyContent="space-between" alignItems="center" mb="$2">
                    <Text color="$color9" fontSize="$2">
                      Value
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium">
                      ${orderValue}
                    </Text>
                  </XStack>
                )}

                {/* Fourth row: Cancel button */}
                <XStack justifyContent="flex-end" marginTop="$2">
                  <Button
                    size="$3"
                    disabled={Boolean(cancelingOrderIds[order.oid])}
                    onPress={async () => {
                      setCancelError(undefined);
                      setCancelingOrderIds(prev => ({ ...prev, [order.oid]: true }));

                      try {
                        const exchangeClient = await getAgentExchangeClient();
                        if (!exchangeClient) {
                          toast.info('Cancelled', {
                            description: 'Order cancellation was cancelled',
                          });
                          return;
                        }

                        let universe = metaUniverse;
                        if (!universe) {
                          const meta = await getInfoClient().meta();
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

                        await exchangeClient.cancel({
                          cancels: [
                            {
                              a: assetIndex,
                              o: order.oid,
                            },
                          ],
                        });

                        toast.success('Order Cancelled', {
                          description: `Successfully cancelled order for ${order.coin}`,
                        });

                        await fetchOpenOrders();
                      } catch (err) {
                        console.error('Error canceling order:', err);
                        const errorMessage = 'Failed to cancel order. Please try again.';
                        setCancelError(errorMessage);
                        toast.error('Cancel Failed', {
                          description: errorMessage,
                        });
                      } finally {
                        setCancelingOrderIds(prev => {
                          const next = { ...prev };
                          delete next[order.oid];
                          return next;
                        });
                      }
                    }}
                  >
                    {cancelingOrderIds[order.oid] ? 'Canceling...' : 'Cancel Order'}
                  </Button>
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
  return <OrdersTabContent />;
}
