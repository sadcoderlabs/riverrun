/**
 * History Tab Component
 * Displays user's fill history (executed trades)
 */

import { useMarket, useMarketStore, useWalletContext } from '@/app-internal';
import { useHistory, type Fill } from '@/app-internal';
import { formatTimestamp } from '@/contexts/order/ports';
import { formatPrice } from '@/infra/hyperliquid/format/formatPrice';
import { formatSize } from '@/infra/hyperliquid/format/formatSize';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';
import React, { useMemo, useState } from 'react';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';

// ============================================================================
// Fill Card Component
// ============================================================================

interface FillCardProps {
  fill: Fill;
  szDecimals: number;
  onPress: () => void;
}

const FillCard = React.memo<FillCardProps>(({ fill, szDecimals, onPress }) => {
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
});

FillCard.displayName = 'FillCard';

// ============================================================================
// Main Component
// ============================================================================

type FillFilter = 'all' | 'long' | 'short';

const ITEMS_PER_PAGE = 20;

export function HistoryTabContent() {
  const { wallet } = useWalletContext();
  const { setSelectedMarketByCoin } = useMarket();
  const markets = useMarketStore(state => state.markets);

  // Get fills from useHistory hook
  const { fills, isLoading, error } = useHistory();

  const [filter, setFilter] = useState<FillFilter>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Build coin -> szDecimals map once for all fills
  const coinDecimalsMap = useMemo(() => {
    const map = new Map<string, number>();
    markets.forEach(market => {
      map.set(market.coin, market.szDecimals);
    });
    return map;
  }, [markets]);

  // Reset to page 1 when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  // Pagination calculations
  const totalPages = Math.ceil(filteredFills.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedFills = filteredFills.slice(startIndex, endIndex);

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

  // Render fills list with filters and pagination
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

      {/* Show filtered fills or empty message */}
      {paginatedFills.length === 0 ? (
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text>No {filter === 'all' ? '' : filter} trades</Text>
        </YStack>
      ) : (
        <>
          {/* Pagination Info */}
          {totalPages > 1 && (
            <XStack justifyContent="space-between" alignItems="center" paddingBottom="$2">
              <Text fontSize="$2" color="$color9">
                Page {currentPage} of {totalPages} ({filteredFills.length} total)
              </Text>
            </XStack>
          )}

          {/* Fill Cards */}
          {paginatedFills.map(fill => {
            const szDecimals = coinDecimalsMap.get(fill.coin) ?? 4;
            return (
              <FillCard
                key={`fill-${fill.tid}`}
                fill={fill}
                szDecimals={szDecimals}
                onPress={() => handleFillClick(fill.coin)}
              />
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <XStack justifyContent="center" alignItems="center" gap="$2" paddingTop="$3">
              <Button
                size="$2"
                disabled={currentPage === 1}
                onPress={() => setCurrentPage(p => Math.max(1, p - 1))}
                opacity={currentPage === 1 ? 0.5 : 1}
              >
                Previous
              </Button>
              <Text fontSize="$2" color="$color9" minWidth={80} textAlign="center">
                {currentPage} / {totalPages}
              </Text>
              <Button
                size="$2"
                disabled={currentPage === totalPages}
                onPress={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                opacity={currentPage === totalPages ? 0.5 : 1}
              >
                Next
              </Button>
            </XStack>
          )}
        </>
      )}
    </YStack>
  );
}

export default function HistoryTab() {
  return <HistoryTabContent />;
}
