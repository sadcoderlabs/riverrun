import { MarketListItem } from '@/components/trade/market-list-item';
import { useMarketsStore } from '@/lib/store/use-markets-store';
import { Search } from '@tamagui/lucide-icons';
import { Sheet } from '@tamagui/sheet';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl } from 'react-native';
import { Input, Spinner, Text, XStack, YStack } from 'tamagui';

interface MarketSelectorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MarketSelectorModal({ open, onOpenChange }: MarketSelectorModalProps) {
  const router = useRouter();

  // Get state and actions from store
  const { markets, favorites, isLoading, initialize, refreshMarkets, toggleFavorite } =
    useMarketsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Initialize markets data when modal opens
  useEffect(() => {
    if (open) {
      initialize();
    }
  }, [open, initialize]);

  // Compute sorted and filtered markets
  const filteredMarkets = useMemo(() => {
    if (markets.length === 0) return [];

    // Sort by favorites first, then volume
    const sorted = [...markets].sort((a, b) => {
      const aIsFavorite = favorites.includes(a.id);
      const bIsFavorite = favorites.includes(b.id);
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      return b.volume - a.volume;
    });

    // Filter by search query
    if (!searchQuery) return sorted;

    const query = searchQuery.toLowerCase();
    const startsWithMatches = sorted.filter(
      m => m.id.toLowerCase().startsWith(query) || m.name.toLowerCase().startsWith(query),
    );
    const includesMatches = sorted.filter(
      m =>
        !m.id.toLowerCase().startsWith(query) &&
        !m.name.toLowerCase().startsWith(query) &&
        (m.id.toLowerCase().includes(query) || m.name.toLowerCase().includes(query)),
    );

    return [...startsWithMatches, ...includesMatches];
  }, [markets, favorites, searchQuery]);

  // Reset search when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery('');
    }
  }, [open]);

  const navigateToMarket = useCallback(
    (marketId: string) => {
      // Close modal first
      onOpenChange(false);
      // Replace current route with new market (default to perp)
      router.replace(`/(main)/trade/perp/${marketId}/(tab)`);
    },
    [router, onOpenChange],
  );

  const handleToggleFavorite = useCallback(
    (marketId: string) => {
      toggleFavorite(marketId);
    },
    [toggleFavorite],
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(undefined);
    try {
      await refreshMarkets();
    } catch (err) {
      console.error('Error refreshing markets:', err);
      setError('Failed to refresh markets');
    } finally {
      setRefreshing(false);
    }
  }, [refreshMarkets]);

  if (!open) {
    return null;
  }

  // Show loading state only if we don't have markets yet
  const showLoading = isLoading && markets.length === 0;

  return (
    <Sheet
      modal
      open={true}
      onOpenChange={onOpenChange}
      snapPoints={[85]}
      dismissOnSnapToBottom
      zIndex={100_000}
      animation="quick"
      disableDrag={false}
    >
      <Sheet.Overlay
        animation="lazy"
        enterStyle={{ opacity: 0 }}
        exitStyle={{ opacity: 0 }}
        opacity={0.5}
        backgroundColor="$background"
      />
      <Sheet.Frame
        padding="$4"
        paddingTop="$2"
        gap="$3"
        backgroundColor="$background"
        borderTopLeftRadius="$6"
        borderTopRightRadius="$6"
      >
        <Sheet.Handle
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
          paddingVertical="$2"
          alignItems="center"
          gap="$2"
        >
          <Search size="$1" color="$gray9" />
          <Input
            flex={1}
            placeholder="Search tokens"
            placeholderTextColor="$gray9"
            value={searchQuery}
            onChangeText={setSearchQuery}
            backgroundColor="transparent"
            borderWidth={0}
            fontSize="$3"
            paddingVertical="$0"
            paddingHorizontal="$0"
          />
        </XStack>

        {/* Market List */}
        {showLoading ? (
          <YStack flex={1} justifyContent="center" alignItems="center">
            <Spinner size="large" />
            <Text marginTop="$2">Loading markets...</Text>
          </YStack>
        ) : error && markets.length === 0 ? (
          <YStack flex={1} justifyContent="center" alignItems="center">
            <Text color="$red10">{error}</Text>
          </YStack>
        ) : (
          <FlatList
            data={filteredMarkets}
            keyExtractor={item => item.id}
            renderItem={({ item: market }) => (
              <MarketListItem
                id={market.id}
                name={market.name}
                price={market.price}
                change={market.change}
                maxLeverage={market.maxLeverage}
                isFavorite={favorites.includes(market.id)}
                onPress={() => navigateToMarket(market.id)}
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
      </Sheet.Frame>
    </Sheet>
  );
}
