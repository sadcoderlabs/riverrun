/**
 * Orders Tab Component
 * Displays user's open orders in a flat list with ability to cancel
 */

import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { useHyperliquidClient, useOrder, useOrderUpdates } from '@/lib/hyperliquid/hooks';
import type { Order } from '@/lib/hyperliquid/types/orders';
import {
  calculateOrderMetrics,
  formatTimestamp,
  getOrderDirection,
  isMarketOrder,
} from '@/lib/hyperliquid/utils';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import type { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useEffect, useMemo, useState } from 'react';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';

// ============================================================================
// Order Card Component
// ============================================================================

interface OrderCardProps {
  order: Order;
  onCancel: (oid: number) => Promise<void>;
  canceling: boolean;
  symbolConverter: SymbolConverter | null;
}

function OrderCard({ order, onCancel, canceling, symbolConverter }: OrderCardProps) {
  // Early return if order data is invalid
  if (!order.coin) {
    return null;
  }

  const metrics = calculateOrderMetrics(order);
  const direction = getOrderDirection(order);
  const isMarket = isMarketOrder(order.orderType);

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
          {order.orderType}
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
  const { getSymbolConverter } = useHyperliquidClient();

  // Get orders from useOrderUpdates (simplified flat structure)
  const { orders, isLoading, error } = useOrderUpdates();

  // Get order operations from useOrder hook
  const { cancelOrder, cancelOrders, isCanceling, error: cancelError } = useOrder();

  const [symbolConverter, setSymbolConverter] = useState<SymbolConverter | null>(null);
  const [filter, setFilter] = useState<OrderFilter>('all');
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});

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
    // Apply direction filter
    let filteredOrders = orders;

    if (filter === 'long') {
      filteredOrders = orders.filter(order => {
        const direction = getOrderDirection(order);
        return direction === 'Long' || direction === 'Close Short';
      });
    } else if (filter === 'short') {
      filteredOrders = orders.filter(order => {
        const direction = getOrderDirection(order);
        return direction === 'Short' || direction === 'Close Long';
      });
    }

    // Sort by timestamp (most recent first)
    return filteredOrders.sort((a, b) => b.timestamp - a.timestamp);
  }, [orders, filter]);

  // Handle order cancellation
  const handleCancelOrder = async (oid: number) => {
    setCancelingOrderIds(prev => ({ ...prev, [oid]: true }));

    try {
      // Find the order to get coin symbol
      const order = orders.find(o => o.oid === oid);
      if (!order) {
        throw new Error('Order not found');
      }

      // Use the hook's cancelOrder method
      await cancelOrder({
        coin: order.coin,
        orderId: oid,
      });

      // WebSocket will automatically update the orders list
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

    // Use the hook's cancelOrders method
    await cancelOrders({
      orders: sortedOrders.map(order => ({
        coin: order.coin,
        orderId: order.oid,
      })),
    });

    // WebSocket will automatically update the orders list
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
          disabled={isCanceling || sortedOrders.length === 0}
          onPress={handleCancelAllOrders}
          pressStyle={{ opacity: 0.8 }}
        >
          {isCanceling ? 'Canceling...' : `Cancel All (${sortedOrders.length})`}
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
      {sortedOrders.map(order => (
        <OrderCard
          key={`order-${order.oid}`}
          order={order}
          onCancel={handleCancelOrder}
          canceling={cancelingOrderIds[order.oid] ?? false}
          symbolConverter={symbolConverter}
        />
      ))}
    </YStack>
  );
}

export default function OrdersTab() {
  return <OrdersTabContent />;
}
