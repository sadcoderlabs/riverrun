/**
 * Orders Tab Component
 * Displays user's open orders in a flat list with ability to cancel
 */

import { useHyperliquidClient, useOrderUpdates } from '@/lib/hyperliquid/hooks';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner-native';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';
import type { OrderNode } from '@/lib/hyperliquid/types/orders';
import { calculateOrderMetrics } from '@/lib/hyperliquid/utils/order-calculations';
import { isMarketOrder, getOrderType } from '@/lib/hyperliquid/utils/order-type-utils';
import type { SymbolConverter } from '@nktkas/hyperliquid/utils';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp to YYYY-MM-DD HH:MM:SS (24-hour format)
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * Get order direction based on side and type
 */
function getOrderDirection(order: OrderNode['order']): string {
  const orderType = getOrderType(order);
  const isBuy = order.side === 'B';

  // Check if orderType is valid
  if (!orderType) {
    return isBuy ? 'Long' : 'Short';
  }

  // For trigger orders (Stop/TP), they're reduce-only
  if (orderType.includes('Stop') || orderType.includes('Take Profit')) {
    return isBuy ? 'Close Short' : 'Close Long';
  }

  // For regular orders
  return isBuy ? 'Long' : 'Short';
}

// ============================================================================
// Order Card Component
// ============================================================================

interface OrderCardProps {
  orderNode: OrderNode;
  onCancel: (oid: number) => Promise<void>;
  canceling: boolean;
  symbolConverter: SymbolConverter | null;
}

function OrderCard({ orderNode, onCancel, canceling, symbolConverter }: OrderCardProps) {
  const { order } = orderNode;

  // Early return if order data is invalid
  if (!order || !order.coin) {
    return null;
  }

  const metrics = calculateOrderMetrics(order);
  const orderType = getOrderType(order);
  const direction = getOrderDirection(order);
  const isMarket = orderType ? isMarketOrder(orderType) : false;

  // Get szDecimals for proper size formatting
  const szDecimals = symbolConverter?.getSzDecimals(order.coin) ?? 4;

  // Get raw trigger condition if it exists
  const triggerCondition =
    'triggerCondition' in order && order.triggerCondition && order.triggerCondition !== 'N/A'
      ? order.triggerCondition
      : null;

  const isBuy = order.side === 'B';

  return (
    <YStack
      padding="$3"
      backgroundColor="$gray2"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$gray5"
      gap="$2"
    >
      {/* Header row: Coin + PERP badge, and Cancel button */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2" alignItems="center">
          <Text fontFamily="$interBold" fontSize="$4">
            {order.coin}-USD
          </Text>
          <View
            backgroundColor="orange"
            paddingHorizontal="$1.5"
            paddingVertical="$0.5"
            borderRadius="$2"
          >
            <Text fontSize="$1" fontFamily="$interMedium" color="white">
              PERP
            </Text>
          </View>
        </XStack>
        <Button
          size="$2"
          backgroundColor="$gray5"
          color="$color"
          disabled={canceling}
          onPress={() => onCancel(order.oid)}
        >
          {canceling ? 'Canceling...' : 'Cancel'}
        </Button>
      </XStack>

      {/* Time Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Time
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {formatTimestamp(order.timestamp)}
        </Text>
      </XStack>

      {/* Type Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Type
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {orderType || 'Unknown'}
        </Text>
      </XStack>

      {/* Direction Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Direction
        </Text>
        <Text fontSize="$2" fontFamily="$interSemiBold" color={isBuy ? '$green10' : '$red10'}>
          {direction}
        </Text>
      </XStack>

      {/* Filled Size / Size Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Filled Size / Size
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {formatSize(metrics.filledSize, szDecimals, true)} /{' '}
          {formatSize(metrics.size, szDecimals, true)} {order.coin}
        </Text>
      </XStack>

      {/* Price Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Price
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {isMarket ? 'Market' : formatPrice(metrics.price, 2, true)}
        </Text>
      </XStack>

      {/* Trigger Conditions Row - always show */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Trigger Conditions
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {triggerCondition || '-'}
        </Text>
      </XStack>

      {/* Reduce Only Row - always show */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Reduce Only
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {order.reduceOnly ? 'True' : 'False'}
        </Text>
      </XStack>
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type OrderFilter = 'all' | 'long' | 'short';

export function OrdersTabContent() {
  const { address, isAuthenticated } = useActiveWallet();
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();

  // Use flat orders list from useOrderUpdates
  const { flatOrders, isLoading, error } = useOrderUpdates();

  const [cancelError, setCancelError] = useState<string | undefined>(undefined);
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});
  const [symbolConverter, setSymbolConverter] = useState<SymbolConverter | null>(null);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [isCancelingAll, setIsCancelingAll] = useState(false);

  // Load SymbolConverter
  useEffect(() => {
    let isMounted = true;
    getSymbolConverter().then(converter => {
      if (isMounted) {
        setSymbolConverter(converter);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [getSymbolConverter]);

  // Filter and sort orders
  const sortedOrders = useMemo(() => {
    // Filter for open orders only
    let openOrders = flatOrders.filter(node => node.status === 'open');

    // Apply direction filter
    if (filter === 'long') {
      openOrders = openOrders.filter(node => {
        const direction = getOrderDirection(node.order);
        return direction === 'Long' || direction === 'Close Short';
      });
    } else if (filter === 'short') {
      openOrders = openOrders.filter(node => {
        const direction = getOrderDirection(node.order);
        return direction === 'Short' || direction === 'Close Long';
      });
    }

    // Sort by timestamp (most recent first)
    return openOrders.sort((a, b) => b.order.timestamp - a.order.timestamp);
  }, [flatOrders, filter]);

  // Handle order cancellation
  const handleCancelOrder = async (oid: number) => {
    setCancelError(undefined);
    setCancelingOrderIds(prev => ({ ...prev, [oid]: true }));

    try {
      const exchangeClient = await getAgentExchangeClient();
      if (!exchangeClient) {
        toast.info('Cancelled', {
          description: 'Order cancellation was cancelled',
        });
        return;
      }

      // Find the order to get coin symbol
      const orderToCancel = flatOrders.find(node => node.order.oid === oid);
      if (!orderToCancel) {
        throw new Error('Order not found');
      }

      // Get asset ID from coin symbol using SymbolConverter
      const converter = await getSymbolConverter();
      const assetId = converter.getAssetId(orderToCancel.order.coin);

      if (assetId === undefined) {
        throw new Error(`Unable to determine asset index for ${orderToCancel.order.coin}`);
      }

      await exchangeClient.cancel({
        cancels: [
          {
            a: assetId,
            o: oid,
          },
        ],
      });

      toast.success('Order Cancelled', {
        description: `Successfully cancelled order for ${orderToCancel.order.coin}`,
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
        delete next[oid];
        return next;
      });
    }
  };

  // Handle cancel all filtered orders
  const handleCancelAllOrders = async () => {
    if (sortedOrders.length === 0) {
      return;
    }

    setCancelError(undefined);
    setIsCancelingAll(true);

    try {
      const exchangeClient = await getAgentExchangeClient();
      if (!exchangeClient) {
        toast.info('Cancelled', {
          description: 'Order cancellation was cancelled',
        });
        return;
      }

      const converter = await getSymbolConverter();

      // Build cancels array for all filtered orders
      const cancels = sortedOrders
        .map(node => {
          const assetId = converter.getAssetId(node.order.coin);
          if (assetId === undefined) {
            console.error(`Unable to determine asset index for ${node.order.coin}`);
            return null;
          }
          return {
            a: assetId,
            o: node.order.oid,
          };
        })
        .filter((cancel): cancel is { a: number; o: number } => cancel !== null);

      if (cancels.length === 0) {
        throw new Error('No valid orders to cancel');
      }

      await exchangeClient.cancel({ cancels });

      const filterText = filter === 'all' ? 'all' : filter;
      toast.success('Orders Cancelled', {
        description: `Successfully cancelled ${cancels.length} ${filterText} order${cancels.length > 1 ? 's' : ''}`,
      });

      // WebSocket will automatically update the orders list
    } catch (err) {
      console.error('Error canceling all orders:', err);
      const errorMessage = 'Failed to cancel orders. Please try again.';
      setCancelError(errorMessage);
      toast.error('Cancel Failed', {
        description: errorMessage,
      });
    } finally {
      setIsCancelingAll(false);
    }
  };

  // Render states
  if (!isAuthenticated || !address) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view orders</Text>
      </YStack>
    );
  }

  if (isLoading) {
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
        <Text color="$red10">{error.message}</Text>
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

  // Render flat list of orders
  return (
    <YStack gap="$2" paddingBottom="$4">
      {/* Filter and Cancel All Section */}
      <XStack justifyContent="space-between" alignItems="center" paddingBottom="$2">
        {/* Filter Buttons */}
        <XStack gap="$2">
          <Button
            size="$2"
            backgroundColor={filter === 'all' ? '$accent9' : '$gray5'}
            color={filter === 'all' ? 'white' : '$color'}
            onPress={() => setFilter('all')}
            pressStyle={{ opacity: 0.8 }}
          >
            All
          </Button>
          <Button
            size="$2"
            backgroundColor={filter === 'long' ? '$green10' : '$gray5'}
            color={filter === 'long' ? 'white' : '$color'}
            onPress={() => setFilter('long')}
            pressStyle={{ opacity: 0.8 }}
          >
            Long
          </Button>
          <Button
            size="$2"
            backgroundColor={filter === 'short' ? '$red10' : '$gray5'}
            color={filter === 'short' ? 'white' : '$color'}
            onPress={() => setFilter('short')}
            pressStyle={{ opacity: 0.8 }}
          >
            Short
          </Button>
        </XStack>

        {/* Cancel All Button */}
        <Button
          size="$2"
          backgroundColor="$red9"
          color="white"
          disabled={isCancelingAll || sortedOrders.length === 0}
          onPress={handleCancelAllOrders}
          pressStyle={{ opacity: 0.8 }}
        >
          {isCancelingAll ? 'Canceling...' : `Cancel All (${sortedOrders.length})`}
        </Button>
      </XStack>

      {cancelError && (
        <YStack
          borderRadius="$2"
          backgroundColor="$red4"
          borderColor="$red8"
          borderWidth={1}
          padding="$3"
        >
          <Text color="$red10" fontFamily="$interMedium">
            {cancelError}
          </Text>
        </YStack>
      )}
      {sortedOrders.map(orderNode => (
        <OrderCard
          key={`order-${orderNode.order.oid}`}
          orderNode={orderNode}
          onCancel={handleCancelOrder}
          canceling={cancelingOrderIds[orderNode.order.oid] ?? false}
          symbolConverter={symbolConverter}
        />
      ))}
    </YStack>
  );
}

export default function OrdersTab() {
  return <OrdersTabContent />;
}
