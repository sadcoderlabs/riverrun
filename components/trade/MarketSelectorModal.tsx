import { MarketListItem } from '@/components/trade/MarketListItem';
import { useMarketStore, useMarket } from '@/core/app-internal';
import { useSubscription } from '@/core/infra/hyperliquid/subscription';
import { ArrowDown, ArrowUp, Search } from '@tamagui/lucide-icons';
import { useCallback, useState, useMemo } from 'react';
import { FlatList, RefreshControl, StyleSheet } from 'react-native';
import Modal from 'react-native-modal';
import { Button, Input, Text, XStack, YStack } from 'tamagui';

export type SortOption = 'name' | 'volume' | 'price' | 'change';
export type SortDirection = 'asc' | 'desc';

interface MarketSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketSelectorModal({ open, onOpenChange }: MarketSelectorModalProps) {
  // State access
  const markets = useMarketStore(state => state.markets);
  const favorites = useMarketStore(state => state.favorites);

  // Business operations
  const { setSelectedMarketByCoin, toggleFavorite, refresh } = useMarket();

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<SortOption>('volume');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Real-time prices (only when modal is open)
  // Pass undefined when modal is closed to skip subscription
  const { data: allMidsData } = useSubscription('allMids', open ? {} : undefined);

  // Filtered and sorted markets with real-time prices
  const filteredMarkets = useMemo(() => {
    if (markets.length === 0) return [];

    // Merge real-time prices if available
    const marketsWithRealtimePrices = open
      ? markets.map(market => {
          const realtimeMidPriceStr = allMidsData?.mids?.[market.coin];
          if (!realtimeMidPriceStr) return market;

          const realtimePrice = parseFloat(realtimeMidPriceStr);
          const PRICE_EPSILON = 0.0001;
          if (Math.abs(realtimePrice - market.price) < PRICE_EPSILON) {
            return market;
          }

          const prevDayPrice = market.price / (1 + market.change / 100);
          const priceChange =
            prevDayPrice > 0
              ? ((realtimePrice - prevDayPrice) / prevDayPrice) * 100
              : market.change;

          return {
            ...market,
            price: realtimePrice,
            change: priceChange,
          };
        })
      : markets;

    // Sort markets
    const sorted = [...marketsWithRealtimePrices].sort((a, b) => {
      const aIsFavorite = favorites.includes(a.marketPair);
      const bIsFavorite = favorites.includes(b.marketPair);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.coin.localeCompare(b.coin);
          break;
        case 'volume':
          comparison = a.volume - b.volume;
          break;
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'change':
          comparison = a.change - b.change;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    // Filter by search query
    if (!searchQuery) return sorted;

    const query = searchQuery.toLowerCase();
    const startsWithMatches = sorted.filter(
      m => m.marketPair.toLowerCase().startsWith(query) || m.coin.toLowerCase().startsWith(query),
    );
    const includesMatches = sorted.filter(
      m =>
        !m.marketPair.toLowerCase().startsWith(query) &&
        !m.coin.toLowerCase().startsWith(query) &&
        (m.marketPair.toLowerCase().includes(query) || m.coin.toLowerCase().includes(query)),
    );

    return [...startsWithMatches, ...includesMatches];
  }, [markets, favorites, searchQuery, allMidsData, open, sortBy, sortDirection]);

  // Toggle sort direction
  const toggleSortDirection = useCallback(() => {
    setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  const [refreshing, setRefreshing] = useState(false);

  const navigateToMarket = useCallback(
    (marketPair: string) => {
      // Close modal first
      onOpenChange(false);

      // Find the market to get coin name
      const market = markets.find(m => m.marketPair === marketPair);
      if (!market) {
        console.error('Market not found:', marketPair);
        return;
      }

      // Update selected market using convenience method
      setSelectedMarketByCoin(market.coin);
    },
    [markets, setSelectedMarketByCoin, onOpenChange],
  );

  const handleToggleFavorite = useCallback(
    (marketPair: string) => {
      toggleFavorite(marketPair);
    },
    [toggleFavorite],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } catch (err) {
      console.error('Error refreshing markets:', err);
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  // Handle sort column click
  const handleSortClick = useCallback(
    (option: SortOption) => {
      if (sortBy === option) {
        // Same column - toggle direction
        toggleSortDirection();
      } else {
        // Different column - set new sort
        setSortBy(option);
      }
    },
    [sortBy, setSortBy, toggleSortDirection],
  );

  return (
    <Modal
      isVisible={open}
      onBackdropPress={() => onOpenChange(false)}
      onBackButtonPress={() => onOpenChange(false)}
      animationIn="slideInUp"
      animationOut="slideOutDown"
      animationInTiming={200}
      animationOutTiming={200}
      backdropOpacity={0.5}
      backdropTransitionInTiming={200}
      backdropTransitionOutTiming={200}
      useNativeDriver={true}
      hideModalContentWhileAnimating={false}
      propagateSwipe={true}
      avoidKeyboard={false}
      style={styles.modal}
    >
      <YStack
        height="85%"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
        padding="$4"
        paddingTop="$2"
        gap="$3"
      >
        {/* Handle */}
        <YStack
          opacity={0.5}
          backgroundColor="$gray9"
          height={3}
          width={32}
          alignSelf="center"
          marginBottom="$1"
          borderRadius="$12"
        />

        {/* Search Box */}
        <XStack
          backgroundColor="$gray3"
          rounded="$12"
          paddingHorizontal="$3"
          paddingVertical="$1.5"
          alignItems="center"
          gap="$2"
        >
          <Search size="$0.75" color="$gray9" />
          <Input
            flex={1}
            placeholder="Search tokens"
            placeholderTextColor="$gray9"
            value={searchQuery}
            onChangeText={setSearchQuery}
            backgroundColor="transparent"
            borderWidth={0}
            fontSize="$2"
            paddingVertical="$0"
            paddingHorizontal="$0"
          />
        </XStack>

        {/* Column Headers */}
        <XStack paddingHorizontal="$3" paddingVertical="$1" alignItems="center" gap="$3">
          {/* Left: PAIRS */}
          <XStack flex={1} alignItems="center" gap="$1">
            <Button
              unstyled
              onPress={() => handleSortClick('name')}
              paddingHorizontal="$1.5"
              paddingVertical="$0.5"
              opacity={sortBy === 'name' ? 1 : 0.6}
            >
              <XStack alignItems="center" gap="$1">
                <Text fontSize="$1" fontFamily="$interMedium" color="$gray10">
                  PAIRS
                </Text>
                {sortBy === 'name' &&
                  (sortDirection === 'asc' ? (
                    <ArrowUp size="$0.75" color="$gray10" />
                  ) : (
                    <ArrowDown size="$0.75" color="$gray10" />
                  ))}
              </XStack>
            </Button>
            <Button
              unstyled
              onPress={() => handleSortClick('volume')}
              paddingHorizontal="$1.5"
              paddingVertical="$0.5"
              opacity={sortBy === 'volume' ? 1 : 0.6}
            >
              <XStack alignItems="center" gap="$1">
                <Text fontSize="$1" fontFamily="$interMedium" color="$gray10">
                  /VOL
                </Text>
                {sortBy === 'volume' &&
                  (sortDirection === 'asc' ? (
                    <ArrowUp size="$0.75" color="$gray10" />
                  ) : (
                    <ArrowDown size="$0.75" color="$gray10" />
                  ))}
              </XStack>
            </Button>
          </XStack>

          {/* Middle: PRICE */}
          <Button
            unstyled
            onPress={() => handleSortClick('price')}
            minWidth={100}
            alignItems="flex-end"
            paddingHorizontal="$1.5"
            paddingVertical="$0.5"
            opacity={sortBy === 'price' ? 1 : 0.6}
          >
            <XStack alignItems="center" gap="$1">
              <Text fontSize="$1" fontFamily="$interMedium" color="$gray10">
                PRICE
              </Text>
              {sortBy === 'price' &&
                (sortDirection === 'asc' ? (
                  <ArrowUp size="$0.75" color="$gray10" />
                ) : (
                  <ArrowDown size="$0.75" color="$gray10" />
                ))}
            </XStack>
          </Button>

          {/* Right: 24H CHG */}
          <Button
            unstyled
            onPress={() => handleSortClick('change')}
            minWidth={80}
            alignItems="flex-end"
            paddingHorizontal="$1.5"
            paddingVertical="$0.5"
            opacity={sortBy === 'change' ? 1 : 0.6}
          >
            <XStack alignItems="center" gap="$1">
              <Text fontSize="$1" fontFamily="$interMedium" color="$gray10">
                24H CHG
              </Text>
              {sortBy === 'change' &&
                (sortDirection === 'asc' ? (
                  <ArrowUp size="$0.75" color="$gray10" />
                ) : (
                  <ArrowDown size="$0.75" color="$gray10" />
                ))}
            </XStack>
          </Button>
        </XStack>

        {/* Market List */}
        {markets.length === 0 ? (
          <YStack flex={1} justifyContent="center" alignItems="center">
            <Text color="$gray10">No markets available</Text>
          </YStack>
        ) : (
          <FlatList
            data={filteredMarkets}
            keyExtractor={item => item.marketPair}
            renderItem={({ item: market }) => (
              <MarketListItem
                marketPair={market.marketPair}
                coin={market.coin}
                price={market.price}
                change={market.change}
                maxLeverage={market.maxLeverage}
                volume={market.volume}
                szDecimals={market.szDecimals}
                isFavorite={favorites.includes(market.marketPair)}
                onPress={() => navigateToMarket(market.marketPair)}
                onToggleFavorite={handleToggleFavorite}
              />
            )}
            ItemSeparatorComponent={() => <YStack height="$0.5" />}
            ListEmptyComponent={
              markets.length > 0 ? (
                <Text textAlign="center" color="$gray9" padding="$4">
                  No markets found
                </Text>
              ) : null
            }
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
            initialNumToRender={20}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            style={{ flex: 1 }}
          />
        )}
      </YStack>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
});
