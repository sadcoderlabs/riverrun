import AdaptiveSelect from '@/components/global/adaptive-select';
import { useOrderBook, type OrderBookLevel } from '@/hooks/useOrderBook';
import { ChevronDown } from '@tamagui/lucide-icons';
import { useMemo, useState } from 'react';
import { FlatList } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { OrderBookRow } from './OrderBookRow';

interface OrderBookProps {
  coin: string;
  onPriceClick?: (price: string) => void;
}

type SizeUnit = 'usd' | 'asset';

/**
 * Order Book component displaying real-time bids and asks
 * Layout: Asks (top, reversed) -> Bids (bottom)
 */
export function OrderBook({ coin, onPriceClick }: OrderBookProps) {
  const [sizeUnit, setSizeUnit] = useState<SizeUnit>('usd');
  const [selectedPrecision, setSelectedPrecision] = useState<string>('1');

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
        onPress={() => onPriceClick?.(item.px)}
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
      {/* Selectors Row - Precision & Size Unit Dropdowns */}
      <XStack
        paddingHorizontal="$1.5"
        paddingVertical="$1"
        backgroundColor="$background"
        justifyContent="space-between"
        alignItems="center"
        borderBottomWidth={1}
        borderBottomColor="$gray8"
      >
        {/* Precision Dropdown */}
        <AdaptiveSelect
          value={selectedPrecision}
          onValueChange={setSelectedPrecision}
          title="Precision"
        >
          <AdaptiveSelect.Trigger>
            <XStack
              gap="$1"
              alignItems="center"
              backgroundColor="$gray3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              height={24}
              borderRadius="$2"
              borderWidth={1}
              borderColor="$gray8"
            >
              <Text fontFamily="$interMedium" fontSize="$2" color="$color">
                {selectedPrecision}
              </Text>
              <ChevronDown size={12} color="$gray10" />
            </XStack>
          </AdaptiveSelect.Trigger>
          <AdaptiveSelect.Item value="1" index={0}>
            1
          </AdaptiveSelect.Item>
          <AdaptiveSelect.Item value="10" index={1}>
            10
          </AdaptiveSelect.Item>
          <AdaptiveSelect.Item value="100" index={2}>
            100
          </AdaptiveSelect.Item>
        </AdaptiveSelect>

        {/* Size Unit Dropdown */}
        <AdaptiveSelect
          value={sizeUnit}
          onValueChange={value => setSizeUnit(value as SizeUnit)}
          title="Size Unit"
        >
          <AdaptiveSelect.Trigger>
            <XStack
              gap="$1"
              alignItems="center"
              backgroundColor="$gray3"
              paddingHorizontal="$2"
              paddingVertical="$1"
              height={24}
              borderRadius="$2"
              borderWidth={1}
              borderColor="$gray8"
            >
              <Text fontFamily="$interMedium" fontSize="$2" color="$color">
                {sizeUnit === 'usd' ? 'USD' : coin}
              </Text>
              <ChevronDown size={12} color="$gray10" />
            </XStack>
          </AdaptiveSelect.Trigger>
          <AdaptiveSelect.Item value="usd" index={0}>
            USD
          </AdaptiveSelect.Item>
          <AdaptiveSelect.Item value="asset" index={1}>
            {coin}
          </AdaptiveSelect.Item>
        </AdaptiveSelect>
      </XStack>

      {/* Column Headers */}
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

        <Text fontFamily="$interMedium" fontSize="$1" color="$gray10" textAlign="right" width={70}>
          Size
        </Text>
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
