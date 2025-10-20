import { CleanLayout } from '@/components/global/clean-layout';
import { MarketListItem } from '@/components/trade/market-list-item';
import { useMarketsStore } from '@/lib/store/use-markets-store';
import { Market } from '@/lib/types/market';
import * as hl from '@nktkas/hyperliquid';
import { ArrowLeft, Search } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

export default function MarketListScreen() {
  const router = useRouter();

  // Get state and actions from store
  const { markets, favorites, isLoading, loadInitialData, fetchAndCacheMarkets, toggleFavorite } =
    useMarketsStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // Compute sorted and filtered markets (instant from memory!)
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
    if (!debouncedQuery) return sorted;

    const query = debouncedQuery.toLowerCase();
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
  }, [markets, favorites, debouncedQuery]);

  // InfoClient for Hyperliquid API
  const infoClientRef = useRef<hl.InfoClient | null>(null);
  if (!infoClientRef.current) {
    const transport = new hl.HttpTransport();
    infoClientRef.current = new hl.InfoClient({ transport });
  }

  // Fetch markets from Hyperliquid API
  const fetchMarketsFromAPI = useCallback(async (): Promise<Market[]> => {
    const infoClient = infoClientRef.current!;
    const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();

    return meta.universe.map((asset: any, index: number) => {
      const assetName = asset.name;
      const ctx = assetCtxs[index];

      const currentPrice = parseFloat(ctx.markPx);
      const prevDayPrice = parseFloat(ctx.prevDayPx);
      const priceChange =
        prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;
      const fundingRate = parseFloat(ctx.funding) * 100;
      const volume = parseFloat(ctx.dayNtlVlm || '0');
      const marketId = `${assetName}-USD`;

      return {
        id: marketId,
        name: marketId,
        price: currentPrice,
        change: priceChange,
        maxLeverage: asset.maxLeverage || 1,
        fundingRate,
        volume,
      };
    });
  }, []);

  // Load initial data on mount
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      await loadInitialData();

      if (!isMounted) return;

      // Check if we have cached data in store
      const currentMarkets = useMarketsStore.getState().markets;

      if (currentMarkets.length === 0) {
        // No cached data, fetch from API with loading state
        fetchAndCacheMarkets(fetchMarketsFromAPI, false).catch(err => {
          if (isMounted) {
            console.error('Error fetching markets:', err);
            setError('Failed to load markets');
          }
        });
      } else {
        // Have cached data, fetch fresh data silently in background
        fetchAndCacheMarkets(fetchMarketsFromAPI, true).catch(err => {
          console.error('Error updating markets:', err);
        });
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const navigateToMarket = useCallback(
    (marketId: string) => {
      router.push(`/(main)/trade/${marketId}/(tab)`);
    },
    [router],
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
      await fetchAndCacheMarkets(fetchMarketsFromAPI, false);
    } catch (err) {
      console.error('Error refreshing markets:', err);
      setError('Failed to refresh markets');
    } finally {
      setRefreshing(false);
    }
  }, [fetchAndCacheMarkets, fetchMarketsFromAPI]);

  const handleGoBack = () => {
    router.back();
  };

  if (isLoading && markets.length === 0) {
    return (
      <CleanLayout>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <Text marginTop="$2">Loading markets...</Text>
        </YStack>
      </CleanLayout>
    );
  }

  if (error && markets.length === 0) {
    return (
      <CleanLayout>
        <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
          <Text color="$red10">{error}</Text>
        </YStack>
      </CleanLayout>
    );
  }

  return (
    <CleanLayout>
      <YStack flex={1} padding="$4" gap="$4">
        {/* Search Box */}
        <XStack alignItems="center" gap="$3">
          <XStack padding="$2" onPress={handleGoBack}>
            <ArrowLeft size="$1" color="$color" />
          </XStack>

          <XStack
            flex={1}
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
        </XStack>

        {/* Market List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
        >
          <YStack gap="$2">
            {filteredMarkets.map(market => (
              <MarketListItem
                key={market.id}
                id={market.id}
                name={market.name}
                price={market.price}
                change={market.change}
                maxLeverage={market.maxLeverage}
                isFavorite={favorites.includes(market.id)}
                onPress={() => navigateToMarket(market.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
            {filteredMarkets.length === 0 && markets.length > 0 && (
              <Text textAlign="center" color="$gray9" padding="$4">
                No markets found
              </Text>
            )}
          </YStack>
        </ScrollView>
      </YStack>
    </CleanLayout>
  );
}
