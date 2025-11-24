/**
 * Orders Tab Component
 * Displays user's open orders in a flat list with ability to cancel
 */

import { useMarket, useMarketStore, useOrder, useOrderStore, useWallet } from '@/app-internal';
import type { Order } from '@/contexts/order/ports';
import {
  calculateOrderMetrics,
  formatTimestamp,
  getOrderDirection,
  isMarketOrder,
} from '@/contexts/order/ports';
import { formatPrice } from '@/infra/hyperliquid/format/formatPrice';
import { formatSize } from '@/infra/hyperliquid/format/formatSize';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';
import { useMemo, useState } from 'react';
import { Spinner, Text, View, XStack, YStack } from 'tamagui';
import { Button } from '../global';

// ============================================================================
// Order Card Component
// ============================================================================

interface OrderCardProps {
  order: Order;
  onCancel: (oid: number) => Promise<void>;
  onPress: () => void;
  canceling: boolean;
}

function OrderCard({ order, onCancel, onPress, canceling }: OrderCardProps) {
  const markets = useMarketStore(state => state.markets);

  // Get szDecimals from markets data (from metaAndAssetCtxs subscription)
  const szDecimals = useMemo(() => {
    const market = markets.find(m => m.coin === order.coin);
    return market?.szDecimals ?? 4;
  }, [markets, order.coin]);

  // Early return if order data is invalid
  if (!order.coin) {
    return null;
  }

  const metrics = calculateOrderMetrics(order);
  const direction = getOrderDirection(order);
  const isMarket = isMarketOrder(order.orderType);

  // Get trigger condition if it exists and is meaningful
  // Show trigger condition for:
  // 1. Active trigger orders (isTrigger=true)
  // 2. Triggered Stop/TP orders (orderType contains Stop/TP and triggerCondition is set)
  const triggerCondition =
    'triggerCondition' in order &&
    order.triggerCondition &&
    order.triggerCondition !== 'N/A' &&
    order.triggerCondition !== '0.0' &&
    order.triggerCondition !== ''
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
      marginBottom="$3"
    >
      {/* Header row: Coin + PERP badge, and Cancel button */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2" alignItems="center">
          <Text fontFamily="$interBold" fontSize="$3">
            {order.coin}-USDC
          </Text>
          <View
            backgroundColor="$gray1"
            paddingHorizontal="$2"
            paddingVertical="$1"
            borderRadius="$4"
          >
            <Text fontSize="$1" fontFamily="$interMedium" color="$color12">
              PERP
            </Text>
          </View>
        </XStack>
        <Button
          backgroundColor="$gray5"
          color="$color"
          disabled={canceling}
          onPress={() => onCancel(order.oid)}
        >
          {canceling ? 'Canceling...' : 'Cancel'}
        </Button>
      </XStack>

      {/* Metrics */}
      <YStack gap="$2" paddingVertical="$2">
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

        {/* Order Value Row */}
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$2" color="$color9">
            Order Value
          </Text>
          <Text fontSize="$2" fontFamily="$interMedium">
            {isMarket ? 'Market' : `$${formatValue(metrics.size * metrics.price, 2)}`}
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
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type OrderFilter = 'all' | 'long' | 'short';

export function OrdersTabContent() {
  const { wallet } = useWallet();
  const { setSelectedMarketByCoin } = useMarket();

  // Get orders from orderStore (simplified flat structure)
  const orders = useOrderStore(state => state.orders);
  const isLoading = useOrderStore(state => state.isLoading);

  // Get order operations from useOrder hook
  const { cancelOrder, cancelOrders, isCanceling, error: cancelError } = useOrder();

  const [filter, setFilter] = useState<OrderFilter>('all');
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});

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

  // Switch market when order card is clicked (without full page reload)
  const handleOrderClick = (coin: string) => {
    setSelectedMarketByCoin(coin);
    // Note: URL will be automatically synced via bidirectional binding in route component
  };

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
  if (!wallet) {
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

  // Note: orderStore doesn't expose errors - they're logged to console

  // Show message when there are no orders at all (not just filtered out)
  if (orders.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No open orders</Text>
      </YStack>
    );
  }

  // Render orders list with filters (always show filters if there are any orders)
  return (
    <YStack gap="$2" paddingBottom="$4">
      {/* Filter and Cancel All Section */}
      <XStack justifyContent="space-between" alignItems="center" paddingBottom="$2">
        {/* Filter Buttons */}
        <XStack gap="$2">
          <Button
            size="$2"
            backgroundColor={filter === 'all' ? '$accent9' : '$gray5'}
            color={filter === 'all' ? '$accent1' : '$color'}
            onPress={() => setFilter('all')}
            pressStyle={{ opacity: 0.8 }}
          >
            All
          </Button>
          <Button
            size="$2"
            backgroundColor={filter === 'long' ? '$green10' : '$gray5'}
            color={filter === 'long' ? '$green1' : '$color'}
            onPress={() => setFilter('long')}
            pressStyle={{ opacity: 0.8 }}
          >
            Long
          </Button>
          <Button
            size="$2"
            backgroundColor={filter === 'short' ? '$red10' : '$gray5'}
            color={filter === 'short' ? '$red1' : '$color'}
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

      {/* Show filtered orders or message if filter results in no orders */}
      {sortedOrders.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>No {filter === 'all' ? '' : filter} orders</Text>
        </YStack>
      ) : (
        sortedOrders.map(order => (
          <OrderCard
            key={`order-${order.oid}`}
            order={order}
            onCancel={handleCancelOrder}
            onPress={() => handleOrderClick(order.coin)}
            canceling={cancelingOrderIds[order.oid] ?? false}
          />
        ))
      )}
    </YStack>
  );
}

export default function OrdersTab() {
  return <OrdersTabContent />;
}
