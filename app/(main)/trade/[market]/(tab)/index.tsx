import { MainLayout } from '@/components/global/main-layout';
import { ChartUI } from '@/components/trade/chart-ui';
import { TradeUI } from '@/components/trade/trade-ui';
import { CandlestickChart, Menu } from '@tamagui/lucide-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, XStack, YStack } from 'tamagui';

export default function TradeIndex() {
  const { market } = useLocalSearchParams<{ market: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [mode, setMode] = useState<'trade' | 'chart'>('trade');

  const navigateToMarketList = () => {
    router.push('/(main)/trade/market-list');
  };

  const toggleMode = () => {
    setMode(mode === 'trade' ? 'chart' : 'trade');
  };

  // Hard-coded market data for rendering purposes
  const marketData = {
    id: market || 'BTC-USD',
    price: 28450.75,
    priceChange: 2.34,
    fundingRate: 0.0012, // 0.12% per 8 hours
    annualizedFunding: 10.95, // Annualized percentage
  };

  // Helper function to format price with commas
  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Determine if price change is positive or negative
  const isPriceUp = marketData.priceChange >= 0;

  return (
    <MainLayout>
      <YStack flex={1}>
        {/* Custom Header with safe area insets */}
        <XStack
          justifyContent="space-between"
          alignItems="center"
          paddingHorizontal="$4"
          paddingVertical="$3"
          paddingTop={insets.top > 0 ? insets.top + 10 : '$3'}
          borderBottomWidth={1}
          borderBottomColor="$gray8"
        >
          <Text fontFamily="$interSemiBold" fontSize="$5" color="$color" fontWeight={500}>
            Futures
          </Text>
          <Image
            source={require('@/assets/images/PoweredByHL-dark.png')}
            style={{ width: 160, height: 27, resizeMode: 'contain' }}
          />
        </XStack>

        {/* Market Information Section */}
        <YStack padding="$4" gap="$4">
          {/* First row: Menu icon, Market ID, and Chart icon */}
          <XStack justifyContent="space-between" alignItems="center">
            <XStack alignItems="center" gap="$2">
              <XStack onPress={navigateToMarketList} pressStyle={{ opacity: 0.7 }} padding="$1">
                <Menu size="$1.5" color="$color" />
              </XStack>
              <Text fontFamily="$interSemiBold" fontSize="$6" color="$color">
                {marketData.id}
              </Text>
            </XStack>
            <XStack onPress={toggleMode} pressStyle={{ opacity: 0.7 }} padding="$1">
              <CandlestickChart size="$1.5" color={mode === 'chart' ? '$gray9' : '$color'} />
            </XStack>
          </XStack>

          {/* Second row: Price info and Funding Rate */}
          <XStack justifyContent="space-between" alignItems="flex-start">
            <YStack>
              <Text fontFamily="$interSemiBold" fontSize="$7" color="$color">
                ${formatPrice(marketData.price)}
              </Text>
              <Text fontFamily="$interMedium" fontSize="$4" color={isPriceUp ? '$green9' : '$red9'}>
                {isPriceUp ? '+' : ''}
                {marketData.priceChange}%
              </Text>
            </YStack>
            <YStack alignItems="flex-end">
              <Text fontFamily="$interRegular" fontSize="$3" color="$gray10">
                Ann. Funding
              </Text>
              <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
                {marketData.annualizedFunding.toFixed(2)}% APR
              </Text>
            </YStack>
          </XStack>
        </YStack>

        {/* Conditional rendering based on mode */}
        {mode === 'trade' ? (
          <TradeUI marketId={marketData.id} />
        ) : (
          <ChartUI marketId={marketData.id} onSwitchToTrade={() => setMode('trade')} />
        )}
      </YStack>
    </MainLayout>
  );
}
