import { CleanLayout } from '@/components/global/clean-layout';
import { MarketListItem } from '@/components/trade/market-list-item';
import { getFavoriteMarkets, toggleFavoriteMarket } from '@/lib/storage/favorites';
import * as hl from '@nktkas/hyperliquid';
import { ArrowLeft, Search } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, ScrollView, Spinner, Text, XStack, YStack } from 'tamagui';

type Market = {
  id: string;
  name: string;
  price: number;
  change: number;
  maxLeverage: number;
  fundingRate: number;
  volume: number;
};

export default function MarketListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [rawMarkets, setRawMarkets] = useState<Market[]>([]); // Raw unsorted markets from API
  const [markets, setMarkets] = useState<Market[]>([]); // Sorted markets for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [favoriteMarkets, setFavoriteMarkets] = useState<string[]>([]);

  // Create InfoClient ref (no wallet needed for public data)
  const infoClientRef = useRef<hl.InfoClient | null>(null);
  if (!infoClientRef.current) {
    const transport = new hl.HttpTransport();
    infoClientRef.current = new hl.InfoClient({ transport });
  }

  // Load favorite markets from storage
  useEffect(() => {
    const loadFavorites = async () => {
      const favorites = await getFavoriteMarkets();
      setFavoriteMarkets(favorites);
    };
    loadFavorites();
  }, []);

  // Fetch market data from Hyperliquid
  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(undefined);

        const infoClient = infoClientRef.current!;

        // Fetch meta data and asset contexts (includes price, funding, etc.)
        const [meta, assetCtxs] = await infoClient.metaAndAssetCtxs();

        // Debug: log all market names
        console.log('=== Hyperliquid Markets ===');
        console.log('Total markets:', meta.universe.length);
        console.log('Market names:', meta.universe.map((a: any) => a.name).join(', '));

        // All assets in meta.universe are perpetual markets
        // (spot markets are in a separate spotMeta endpoint)
        // Note: some perps have onlyIsolated:true meaning isolated margin only
        const perpMarkets = meta.universe;

        // Map to our Market type
        const marketData: Market[] = perpMarkets.map((asset: any, index: number) => {
          const assetName = asset.name;
          const ctx = assetCtxs[index];

          // Calculate 24h price change percentage
          const currentPrice = parseFloat(ctx.markPx);
          const prevDayPrice = parseFloat(ctx.prevDayPx);
          const priceChange =
            prevDayPrice > 0 ? ((currentPrice - prevDayPrice) / prevDayPrice) * 100 : 0;

          // Funding rate (convert to percentage)
          const fundingRate = parseFloat(ctx.funding) * 100;

          // 24h volume (dayNtlVlm = daily notional volume in USD)
          const volume = parseFloat(ctx.dayNtlVlm || '0');

          // Market ID for both routing and display: "BTC-USD" format for perps
          // (future: spot will use "BTC/USDC" with slash to differentiate)
          const marketId = `${assetName}-USD`;

          return {
            id: marketId,
            name: marketId,
            price: currentPrice,
            change: priceChange,
            maxLeverage: asset.maxLeverage || 1,
            fundingRate: fundingRate,
            volume: volume,
          };
        });

        // Save raw markets data (before sorting)
        setRawMarkets(marketData);
      } catch (err) {
        console.error('Error fetching markets:', err);
        setError('Failed to load markets');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, []);

  // Sort markets by favorites and volume whenever favorites or rawMarkets change
  useEffect(() => {
    if (rawMarkets.length === 0) return;

    const sortedMarkets = [...rawMarkets].sort((a, b) => {
      const aIsFavorite = favoriteMarkets.includes(a.id);
      const bIsFavorite = favoriteMarkets.includes(b.id);

      // Favorites go first
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;

      // Within same favorite status, sort by volume
      return b.volume - a.volume;
    });

    setMarkets(sortedMarkets);
  }, [favoriteMarkets, rawMarkets]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Filter markets based on debounced query
  useEffect(() => {
    if (debouncedQuery === '') {
      setFilteredMarkets(markets);
      return;
    }

    // First, find markets that start with the query (higher priority matches)
    const startsWithMatches = markets.filter(
      market =>
        market.id.toLowerCase().startsWith(debouncedQuery.toLowerCase()) ||
        market.name.toLowerCase().startsWith(debouncedQuery.toLowerCase()),
    );

    // Then, find markets that include the query but don't start with it (lower priority matches)
    const includesMatches = markets.filter(market => {
      const lowerCaseId = market.id.toLowerCase();
      const lowerCaseName = market.name.toLowerCase();
      const lowerCaseQuery = debouncedQuery.toLowerCase();

      return (
        (lowerCaseId.includes(lowerCaseQuery) && !lowerCaseId.startsWith(lowerCaseQuery)) ||
        (lowerCaseName.includes(lowerCaseQuery) && !lowerCaseName.startsWith(lowerCaseQuery))
      );
    });

    // Combine the results with priority matches first
    setFilteredMarkets([...startsWithMatches, ...includesMatches]);
  }, [debouncedQuery, markets]);

  const navigateToMarket = useCallback(
    (marketId: string) => {
      router.push(`/(main)/trade/${marketId}/(tab)`);
    },
    [router],
  );

  const handleToggleFavorite = useCallback(async (marketId: string) => {
    const newIsFavorite = await toggleFavoriteMarket(marketId);
    // Update local state immediately for UI responsiveness
    setFavoriteMarkets(prev =>
      newIsFavorite ? [...prev, marketId] : prev.filter(id => id !== marketId),
    );
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <CleanLayout>
        <YStack flex={1} justifyContent="center" alignItems="center">
          <Spinner size="large" />
          <Text marginTop="$2">Loading markets...</Text>
        </YStack>
      </CleanLayout>
    );
  }

  if (error) {
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <YStack gap="$2">
            {filteredMarkets.map(market => (
              <MarketListItem
                key={market.id}
                id={market.id}
                name={market.name}
                price={market.price}
                change={market.change}
                maxLeverage={market.maxLeverage}
                isFavorite={favoriteMarkets.includes(market.id)}
                onPress={() => navigateToMarket(market.id)}
                onToggleFavorite={handleToggleFavorite}
              />
            ))}
            {filteredMarkets.length === 0 && (
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
