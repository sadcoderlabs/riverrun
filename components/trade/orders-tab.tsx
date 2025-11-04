/**
 * Orders Tab Component
 * Displays user's open orders in a flat list with ability to cancel
 */

import { useHyperliquidClient, useOrderUpdates } from '@/lib/hyperliquid/hooks';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';
import { useState, useMemo } from 'react';
import { toast } from 'sonner-native';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';
import type { OrderNode } from '@/lib/hyperliquid/types/orders';
import { calculateOrderMetrics } from '@/lib/hyperliquid/utils/order-calculations';
import {
  getOrderTypeLabel,
  isMarketOrder,
  getOrderType,
} from '@/lib/hyperliquid/utils/order-type-utils';
import { parseTriggerCondition } from '@/lib/hyperliquid/utils/trigger-utils';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Format timestamp to MM-DD-YYYY HH:MM:SS
 */
function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
}

// ============================================================================
// Order Card Component
// ============================================================================

interface OrderCardProps {
  orderNode: OrderNode;
  onCancel: (oid: number) => Promise<void>;
  canceling: boolean;
}

function OrderCard({ orderNode, onCancel, canceling }: OrderCardProps) {
  const { order } = orderNode;
  const metrics = calculateOrderMetrics(order);
  const orderType = getOrderType(order);
  const typeLabel = getOrderTypeLabel(order);
  const triggerCondition = parseTriggerCondition(order);
  const isMarket = isMarketOrder(orderType);

  const isBuy = order.side === 'B';

  return (
    <YStack
      padding="$3"
      backgroundColor="$gray2"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$gray5"
      marginHorizontal="$4"
      marginTop="$3"
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

      {/* Order Type + Direction Row */}
      <XStack>
        <Text fontSize="$3" fontFamily="$interSemiBold" color={isBuy ? '$green10' : '$red10'}>
          {typeLabel}
        </Text>
      </XStack>

      {/* Timestamp Row */}
      <XStack justifyContent="flex-end">
        <Text fontSize="$1" color="$color9">
          {formatTimestamp(order.timestamp)}
        </Text>
      </XStack>

      {/* Filled / Amount Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Filled / Amount (USD)
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {formatValue(metrics.filledUSD, 2)} / {formatValue(metrics.totalUSD, 2)}
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

      {/* Conditions Row - show for trigger orders (Stop/TP) */}
      {triggerCondition && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$2" color="$color9">
            Conditions
          </Text>
          <Text fontSize="$2" fontFamily="$interMedium">
            {triggerCondition.formatted}
          </Text>
        </XStack>
      )}

      {/* Reduce Only Row - only if true */}
      {order.reduceOnly && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontSize="$2" color="$color9">
            Reduce Only
          </Text>
          <Text fontSize="$2" fontFamily="$interMedium">
            True
          </Text>
        </XStack>
      )}
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function OrdersTabContent() {
  const { address, isAuthenticated } = useActiveWallet();
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();

  // Use flat orders list from useOrderUpdates
  const { flatOrders, isLoading, error } = useOrderUpdates();

  const [cancelError, setCancelError] = useState<string | undefined>(undefined);
  const [cancelingOrderIds, setCancelingOrderIds] = useState<Record<number, boolean>>({});

  // Filter and sort orders
  const sortedOrders = useMemo(() => {
    // Filter for open orders only
    const openOrders = flatOrders.filter(node => node.status === 'open');

    // Sort by timestamp (most recent first)
    return openOrders.sort((a, b) => b.order.timestamp - a.order.timestamp);
  }, [flatOrders]);

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
    <YStack>
      <YStack paddingBottom="$4">
        {cancelError && (
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
        )}
        {sortedOrders.map(orderNode => (
          <OrderCard
            key={`order-${orderNode.order.oid}`}
            orderNode={orderNode}
            onCancel={handleCancelOrder}
            canceling={cancelingOrderIds[orderNode.order.oid] ?? false}
          />
        ))}
      </YStack>
    </YStack>
  );
}

export default function OrdersTab() {
  return <OrdersTabContent />;
}
