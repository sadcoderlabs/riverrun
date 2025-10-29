import { useHyperliquidClient } from '@/hooks/useHyperliquidClient';
import { useOrderUpdates } from '@/hooks/useOrderUpdates';
import { useWallet } from '@/hooks/useWallet';
import { useMemo, useState } from 'react';
import { toast } from 'sonner-native';
import { Button, Spinner, Text, XStack, YStack } from 'tamagui';

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
  const { address, isAuthenticated } = useWallet();
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();

  // Subscribe to order updates via WebSocket
  const { orders: orderUpdates, isLoading: loading, error: wsError } = useOrderUpdates();

  console.log('[OrdersTabContent] State:', {
    address,
    isAuthenticated,
    orderUpdatesCount: orderUpdates.length,
    loading,
    wsError,
  });

  const [cancelError, setCancelError] = useState<string | undefined>(undefined);
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});

  const error = wsError ? wsError.message : undefined;

  // Filter and sort orders - only show open orders
  const sortedOrders = useMemo(() => {
    console.log('[OrdersTabContent] Processing orders:', {
      totalUpdates: orderUpdates.length,
      updates: orderUpdates,
    });

    // Filter for open orders only
    const openOrders = orderUpdates
      .filter(update => {
        const isOpen = update.status === 'open';
        console.log('[OrdersTabContent] Order status:', {
          oid: update.order.oid,
          status: update.status,
          isOpen,
        });
        return isOpen;
      })
      .map(update => update.order);

    console.log('[OrdersTabContent] Open orders:', {
      count: openOrders.length,
      orders: openOrders,
    });

    // Sort by timestamp (most recent first)
    const sorted = openOrders.sort((a, b) => b.timestamp - a.timestamp);
    console.log('[OrdersTabContent] Sorted orders:', sorted);

    return sorted;
  }, [orderUpdates]);

  if (!isAuthenticated || !address) {
    console.log('[OrdersTabContent] Not authenticated or no address');
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view orders</Text>
      </YStack>
    );
  }

  if (loading) {
    console.log('[OrdersTabContent] Loading...');
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2">Loading open orders...</Text>
      </YStack>
    );
  }

  if (error) {
    console.log('[OrdersTabContent] Error:', error);
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10">{error}</Text>
      </YStack>
    );
  }

  if (sortedOrders.length === 0) {
    console.log('[OrdersTabContent] No orders');
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No open orders</Text>
      </YStack>
    );
  }

  console.log('[OrdersTabContent] Rendering orders:', sortedOrders.length);

  return (
    <YStack>
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

                      // Get asset ID from coin symbol using SymbolConverter
                      const converter = await getSymbolConverter();
                      const assetId = converter.getAssetId(order.coin);

                      if (assetId === undefined) {
                        throw new Error(`Unable to determine asset index for ${order.coin}`);
                      }

                      await exchangeClient.cancel({
                        cancels: [
                          {
                            a: assetId,
                            o: order.oid,
                          },
                        ],
                      });

                      toast.success('Order Cancelled', {
                        description: `Successfully cancelled order for ${order.coin}`,
                      });

                      // WebSocket will automatically update the orders list
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
    </YStack>
  );
}

export default function OrdersTab() {
  return <OrdersTabContent />;
}
