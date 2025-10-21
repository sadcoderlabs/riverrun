import { ChartUI } from '@/components/trade/chart-ui';
import { MarketSelectorModal } from '@/components/trade/market-selector-modal';
import { TradeUI } from '@/components/trade/trade-ui';
import { useMarketsStore } from '@/lib/store/use-markets-store';
import { CandlestickChart, ChevronUp, Menu } from '@tamagui/lucide-icons';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { AnimatePresence, Text, XStack, YStack } from 'tamagui';

export default function PerpTradeIndex() {
  const { market } = useLocalSearchParams<{ market: string }>();
  const [isChart, setIsChart] = useState(false);

  // Use modal state from Zustand store
  const { isMarketSelectorOpen, setMarketSelectorOpen } = useMarketsStore();

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
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section */}
      <YStack padding="$4" gap="$4">
        {/* First row: Menu icon, Market ID, and Chart icon */}
        <XStack justifyContent="space-between" alignItems="center">
          <XStack
            alignItems="center"
            gap="$2"
            onPress={() => setMarketSelectorOpen(true)}
            pressStyle={{ opacity: 0.7 }}
            padding="$1"
          >
            <Menu size="$1.5" color="$color" />
            <Text fontFamily="$interSemiBold" fontSize="$6" color="$color">
              {marketData.id}
            </Text>
          </XStack>
          <XStack onPress={() => setIsChart(!isChart)} pressStyle={{ opacity: 0.7 }} padding="$1">
            <CandlestickChart size="$1.5" color={isChart ? '$gray9' : '$color'} />
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

      {/* Collapsible Chart Section */}
      <AnimatePresence>
        {isChart && (
          <YStack
            key="chart-container"
            animation="quick"
            enterStyle={{
              height: 0,
              opacity: 0,
            }}
            exitStyle={{
              height: 0,
              opacity: 0,
            }}
            animateOnly={['height', 'opacity']}
            height={400}
            opacity={1}
            overflow="hidden"
          >
            <ChartUI marketId={marketData.id} />
            <XStack
              justifyContent="center"
              alignItems="center"
              paddingVertical="$2"
              backgroundColor="$background"
              borderBottomWidth={1}
              borderBottomColor="$gray8"
              onPress={() => setIsChart(false)}
              pressStyle={{ opacity: 0.7 }}
            >
              <ChevronUp size="$1" color="$gray10" />
            </XStack>
          </YStack>
        )}
      </AnimatePresence>

      <TradeUI marketId={marketData.id} />

      {/* Market Selector Modal */}
      <MarketSelectorModal open={isMarketSelectorOpen} onOpenChange={setMarketSelectorOpen} />
    </YStack>
  );
}
