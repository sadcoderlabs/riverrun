/**
 * History Tab Component
 * Displays user's fill history (executed trades)
 */

import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';
import { useHistory, type Fill } from '@/core/contexts/history/reactNative/useHistory';
import { formatTimestamp } from '@/lib/riverrun/order';
import { useWalletContext, useMarketStore, useMarket } from '@/core/composition';
import { useMemo, useState } from 'react';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';

// ============================================================================
// Fill Card Component
// ============================================================================

interface FillCardProps {
  fill: Fill;
  onPress: () => void;
}

function FillCard({ fill, onPress }: FillCardProps) {
  const markets = useMarketStore(state => state.markets);

  // Get szDecimals from markets data (from metaAndAssetCtxs subscription)
  const szDecimals = useMemo(() => {
    const market = markets.find(m => m.coin === fill.coin);
    return market?.szDecimals ?? 4;
  }, [markets, fill.coin]);

  // Early return if fill data is invalid
  if (!fill.coin) {
    return null;
  }

  const price = parseFloat(fill.px);
  const size = parseFloat(fill.sz);
  const fee = parseFloat(fill.fee);
  const closedPnl = parseFloat(fill.closedPnl);

  // Determine color based on direction
  // Long/Open Long/Buy = green, Short/Open Short/Sell = red
  const isLongDirection =
    fill.dir === 'Open Long' || fill.dir === 'Close Short' || fill.dir === 'Buy';
  const directionColor = isLongDirection ? '$green10' : '$red10';

  return (
    <YStack
      padding="$3"
      backgroundColor="$gray2"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$gray5"
      gap="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, backgroundColor: '$gray3' }}
      cursor="pointer"
    >
      {/* Header row: Coin + PERP badge */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack gap="$2" alignItems="center">
          <Text fontFamily="$interBold" fontSize="$4">
            {fill.coin}-USD
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
        {/* Show PnL if it exists and is non-zero */}
        {closedPnl !== 0 && (
          <Text
            fontSize="$2"
            fontFamily="$interSemiBold"
            color={closedPnl > 0 ? '$green10' : '$red10'}
          >
            {closedPnl > 0 ? '+' : '-'}${formatValue(Math.abs(closedPnl), 2)}
          </Text>
        )}
      </XStack>

      {/* Time Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Time
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {formatTimestamp(fill.time)}
        </Text>
      </XStack>

      {/* Direction Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Direction
        </Text>
        <Text fontSize="$2" fontFamily="$interSemiBold" color={directionColor}>
          {fill.dir}
        </Text>
      </XStack>

      {/* Price Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Price
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {formatPrice(price, 2, true)}
        </Text>
      </XStack>

      {/* Size Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Size
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium">
          {formatSize(size, szDecimals, true)} {fill.coin}
        </Text>
      </XStack>

      {/* Fee Row */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Fee
        </Text>
        <Text fontSize="$2" fontFamily="$interMedium" color={fee < 0 ? '$green10' : '$color'}>
          {fee < 0 ? '+' : '-'}${Math.abs(fee)}
        </Text>
      </XStack>
    </YStack>
  );
}

// ============================================================================
// Main Component
// ============================================================================

type FillFilter = 'all' | 'long' | 'short';

export function HistoryTabContent() {
  const { wallet } = useWalletContext();
  const { setSelectedMarketByCoin } = useMarket();

  // Get fills from useHistory hook
  const { fills, isLoading, error } = useHistory();

  const [filter, setFilter] = useState<FillFilter>('all');

  // Filter fills
  const filteredFills = useMemo(() => {
    if (filter === 'all') {
      return fills;
    }

    if (filter === 'long') {
      // Show Long-related fills (Open Long, Close Short, Buy)
      return fills.filter(
        fill => fill.dir === 'Open Long' || fill.dir === 'Close Short' || fill.dir === 'Buy',
      );
    }

    if (filter === 'short') {
      // Show Short-related fills (Open Short, Close Long, Sell)
      return fills.filter(
        fill => fill.dir === 'Open Short' || fill.dir === 'Close Long' || fill.dir === 'Sell',
      );
    }

    return fills;
  }, [fills, filter]);

  // Switch market when fill card is clicked
  const handleFillClick = (coin: string) => {
    setSelectedMarketByCoin(coin);
    // Note: URL will be automatically synced via bidirectional binding in route component
  };

  // Render states
  if (!wallet) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view history</Text>
      </YStack>
    );
  }

  if (isLoading) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2">Loading trade history...</Text>
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

  // Show message when there are no fills at all
  if (fills.length === 0) {
    return (
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No trade history</Text>
      </YStack>
    );
  }

  // Render fills list with filters
  return (
    <YStack gap="$2" paddingBottom="$4">
      {/* Filter Section */}
      <XStack justifyContent="flex-start" alignItems="center" paddingBottom="$2" gap="$2">
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

      {/* Show filtered fills or message if filter results in no fills */}
      {filteredFills.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>No {filter === 'all' ? '' : filter} trades</Text>
        </YStack>
      ) : (
        filteredFills.map(fill => (
          <FillCard
            key={`fill-${fill.tid}`}
            fill={fill}
            onPress={() => handleFillClick(fill.coin)}
          />
        ))
      )}
    </YStack>
  );
}

export default function HistoryTab() {
  return <HistoryTabContent />;
}
