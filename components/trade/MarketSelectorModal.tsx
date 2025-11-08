import { MarketListItem } from '@/components/trade/MarketListItem';
import {
  useMarketData,
  useMarketSelector,
  useMarketsStore,
  type SortOption,
} from '@/lib/hyperliquid/market';
import { ArrowDown, ArrowUp, Search } from '@tamagui/lucide-icons';
import { useCallback, useState } from 'react';
import { FlatList, Modal, Pressable, RefreshControl, StyleSheet } from 'react-native';
import { Button, Input, Spinner, Text, XStack, YStack } from 'tamagui';

interface MarketSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketSelectorModal({ open, onOpenChange }: MarketSelectorModalProps) {
  const { setSelectedMarketByCoin } = useMarketsStore();

  // Market data fetching and caching (initialized once at app level)
  const { isLoading, error: dataError, refresh } = useMarketData();

  // Market selector business logic
  const {
    searchQuery,
    setSearchQuery,
    markets,
    favorites,
    filteredMarkets,
    toggleFavorite,
    sortBy,
    sortDirection,
    setSortBy,
    toggleSortDirection,
  } = useMarketSelector({ enableRealtimePrices: open });

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

  // Show loading state only if we don't have markets yet
  const showLoading = isLoading && markets.length === 0;

  return (
    <Modal
      visible={open}
      transparent
      animationType="slide"
      onRequestClose={() => onOpenChange(false)}
      statusBarTranslucent
    >
      {/* Overlay */}
      <Pressable style={styles.overlay} onPress={() => onOpenChange(false)}>
        {/* Content Container */}
        <Pressable style={styles.contentContainer} onPress={e => e.stopPropagation()}>
          <YStack
            flex={1}
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
            {showLoading ? (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <Spinner size="large" />
                <Text marginTop="$2">Loading markets...</Text>
              </YStack>
            ) : dataError && markets.length === 0 ? (
              <YStack flex={1} justifyContent="center" alignItems="center">
                <Text color="$red10">{dataError.message}</Text>
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
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
                }
                initialNumToRender={20}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                style={{ flex: 1 }}
              />
            )}
          </YStack>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  contentContainer: {
    height: '85%',
    width: '100%',
  },
});
