import { useOrderBook, type OrderBookLevel } from '@/hooks/useOrderBook';
import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Button, Text, XStack, YStack } from 'tamagui';
import { OrderBookRow } from './OrderBookRow';

interface OrderBookProps {
  coin: string;
}

type SizeUnit = 'usd' | 'asset';

/**
 * Order Book component displaying real-time bids and asks
 * Layout: Asks (top, reversed) -> Bids (bottom)
 */
export function OrderBook({ coin }: OrderBookProps) {
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('usd');

  const { data, isLoading, error } = useOrderBook({ coin });

  // Calculate max size for depth percentage calculation
  const maxSize = useMemo(() => {
    if (!data) return 0;
    const allSizes = [...data.bids, ...data.asks].map(level => parseFloat(level.sz));
    return Math.max(...allSizes, 0);
  }, [data]);

  // Prepare asks data (reversed for top-down display, limited to 10)
  const reversedAsks = useMemo(() => {
    if (!data?.asks) return [];
    return [...data.asks].slice(0, 10).reverse();
  }, [data?.asks]);

  // Prepare bids data (limited to 10)
  const limitedBids = useMemo(() => {
    if (!data?.bids) return [];
    return data.bids.slice(0, 10);
  }, [data?.bids]);

  // Render individual order book row
  const renderOrderBookRow = (item: OrderBookLevel, type: 'bid' | 'ask') => {
    const depthPercentage = maxSize > 0 ? (parseFloat(item.sz) / maxSize) * 100 : 0;

    // Calculate display size based on unit
    let displaySize = item.sz;
    if (sizeUnit === 'usd') {
      const sizeInUsd = parseFloat(item.sz) * parseFloat(item.px);
      displaySize = sizeInUsd.toString();
    }

    return (
      <OrderBookRow
        key={`${type}-${item.px}`}
        price={item.px}
        size={displaySize}
        type={type}
        depthPercentage={depthPercentage}
      />
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
          Loading order book...
        </Text>
      </YStack>
    );
  }

  // Error state
  if (error) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interRegular" fontSize="$3" color="$red10">
          Failed to load order book
        </Text>
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10" marginTop="$2">
          {error.message}
        </Text>
      </YStack>
    );
  }

  // No data state
  if (!data) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
          No order book data
        </Text>
      </YStack>
    );
  }

  return (
    <YStack flex={1} backgroundColor="$background">
      {/* Column Headers with Size Unit Selector */}
      <XStack
        paddingHorizontal="$1.5"
        paddingVertical="$0.75"
        backgroundColor="$gray2"
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontFamily="$interMedium" fontSize="$1" color="$gray10" minWidth={70}>
          Price (USD)
        </Text>

        {/* Size Unit Toggle */}
        <XStack gap="$0.5" alignItems="center">
          <Button
            size="$1"
            paddingHorizontal="$1.5"
            paddingVertical="$0.5"
            height={18}
            backgroundColor={sizeUnit === 'usd' ? '$gray8' : 'transparent'}
            borderWidth={0}
            onPress={() => setSizeUnit('usd')}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text
              fontFamily="$interMedium"
              fontSize="$1"
              color={sizeUnit === 'usd' ? '$color' : '$gray10'}
            >
              USD
            </Text>
          </Button>

          <Button
            size="$1"
            paddingHorizontal="$1.5"
            paddingVertical="$0.5"
            height={18}
            backgroundColor={sizeUnit === 'asset' ? '$gray8' : 'transparent'}
            borderWidth={0}
            onPress={() => setSizeUnit('asset')}
            pressStyle={{ opacity: 0.7 }}
          >
            <Text
              fontFamily="$interMedium"
              fontSize="$1"
              color={sizeUnit === 'asset' ? '$color' : '$gray10'}
            >
              {coin}
            </Text>
          </Button>
        </XStack>
      </XStack>

      <YStack flex={1}>
        {/* Asks Section (Top) - Red theme */}
        <FlatList
          data={reversedAsks}
          renderItem={({ item }) => renderOrderBookRow(item, 'ask')}
          keyExtractor={(item, index) => `ask-${item.px}-${index}`}
          scrollEnabled={false}
          inverted={false}
        />

        {/* Bids Section (Bottom) - Green theme */}
        <FlatList
          data={limitedBids}
          renderItem={({ item }) => renderOrderBookRow(item, 'bid')}
          keyExtractor={(item, index) => `bid-${item.px}-${index}`}
          scrollEnabled={false}
        />
      </YStack>
    </YStack>
  );
}
