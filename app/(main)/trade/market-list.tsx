import { CleanLayout } from '@/components/global/clean-layout';
import { MarketListItem } from '@/components/trade/market-list-item';
import { ArrowLeft, Search } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Input, ScrollView, Text, XStack, YStack } from 'tamagui';

type Market = {
  id: string;
  name: string;
  price: number;
  change: number;
  maxLeverage: number;
  fundingRate: number;
};

export default function MarketListScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredMarkets, setFilteredMarkets] = useState<Market[]>([]);
  const [debouncedQuery, setDebouncedQuery] = useState('');

  const markets = useMemo<Market[]>(
    () => [
      {
        id: 'BTC-USD',
        name: 'Bitcoin',
        price: 28450.75,
        change: 2.34,
        maxLeverage: 40,
        fundingRate: 0.0012,
      },
      {
        id: 'ETH-USD',
        name: 'Ethereum',
        price: 1875.25,
        change: -0.87,
        maxLeverage: 20,
        fundingRate: -0.0008,
      },
      {
        id: 'SOL-USD',
        name: 'Solana',
        price: 42.18,
        change: 3.65,
        maxLeverage: 10,
        fundingRate: 0.0025,
      },
      {
        id: 'AVAX-USD',
        name: 'Avalanche',
        price: 32.47,
        change: 1.23,
        maxLeverage: 10,
        fundingRate: 0.0018,
      },
      {
        id: 'MATIC-USD',
        name: 'Polygon',
        price: 0.85,
        change: -1.45,
        maxLeverage: 5,
        fundingRate: -0.0015,
      },
      {
        id: 'DOT-USD',
        name: 'Polkadot',
        price: 7.92,
        change: 0.78,
        maxLeverage: 10,
        fundingRate: 0.0009,
      },
      {
        id: 'LINK-USD',
        name: 'Chainlink',
        price: 14.36,
        change: 4.21,
        maxLeverage: 10,
        fundingRate: 0.0031,
      },
      {
        id: 'ADA-USD',
        name: 'Cardano',
        price: 0.52,
        change: -0.34,
        maxLeverage: 5,
        fundingRate: -0.0005,
      },
      {
        id: 'DOGE-USD',
        name: 'Dogecoin',
        price: 0.078,
        change: 5.67,
        maxLeverage: 5,
        fundingRate: 0.0042,
      },
      {
        id: 'XRP-USD',
        name: 'Ripple',
        price: 0.63,
        change: 1.89,
        maxLeverage: 5,
        fundingRate: 0.0016,
      },
    ],
    [],
  );

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

  // Initialize filtered markets with all markets
  useEffect(() => {
    setFilteredMarkets(markets);
  }, [markets]);

  const navigateToMarket = useCallback(
    (marketId: string) => {
      router.push(`/(main)/trade/${marketId}/(tab)`);
    },
    [router],
  );

  const handleGoBack = () => {
    router.back();
  };

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
                price={market.price}
                change={market.change}
                maxLeverage={market.maxLeverage}
                onPress={() => navigateToMarket(market.id)}
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
