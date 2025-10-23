import { ChartUI } from '@/components/trade/chart-ui';
import { MarketSelectorModal } from '@/components/trade/market-selector-modal';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useActiveAssetData } from '@/hooks/useActiveAssetData';
import { formatMarketId } from '@/lib/hyperliquid/market-utils';
import { useMarketsStore } from '@/lib/store/use-markets-store';
import { CandlestickChart, ChevronUp, Menu } from '@tamagui/lucide-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { AnimatePresence, Text, XStack, YStack } from 'tamagui';

// Temporary hardcoded asset mapping (will be replaced with API call)
const ASSET_INDEX_MAP: Record<string, number> = {
  BTC: 0,
  ETH: 1,
  SOL: 2,
  // Add more as needed
};

export default function PerpTradeIndex() {
  const { asset } = useLocalSearchParams<{ asset: string }>();
  const [isChart, setIsChart] = useState(false);

  // Use modal state from Zustand store
  const { isMarketSelectorOpen, setMarketSelectorOpen } = useMarketsStore();

  // Get asset name and assetId (index in Hyperliquid)
  const assetSymbol = asset || 'BTC';
  const assetId = useMemo(() => ASSET_INDEX_MAP[assetSymbol.toUpperCase()] ?? 0, [assetSymbol]);

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin: assetSymbol,
    enabled: true,
  });

  // Format market display (e.g., "BTC-USD")
  const marketDisplay = formatMarketId(assetSymbol, 'perp');

  // Hard-coded market data for rendering purposes
  const marketData = {
    assetId,
    assetName: assetSymbol,
    marketDisplay,
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
      <YStack padding="$3" gap="$2">
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
            <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
              {marketData.marketDisplay}
            </Text>
          </XStack>
          <XStack onPress={() => setIsChart(!isChart)} pressStyle={{ opacity: 0.7 }} padding="$1">
            <CandlestickChart size="$1.5" color={isChart ? '$gray9' : '$color'} />
          </XStack>
        </XStack>

        {/* Second row: Price info and Funding Rate */}
        <XStack justifyContent="space-between" alignItems="flex-start">
          <XStack gap="$2" alignItems="baseline">
            <Text fontFamily="$interSemiBold" fontSize="$5" color="$color">
              ${formatPrice(marketData.price)}
            </Text>
            <Text fontFamily="$interMedium" fontSize="$3" color={isPriceUp ? '$green9' : '$red9'}>
              {isPriceUp ? '+' : ''}
              {marketData.priceChange}%
            </Text>
          </XStack>
          <YStack alignItems="flex-end">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Ann. Funding
            </Text>
            <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
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
            <ChartUI marketId={marketData.marketDisplay} />
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

      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel
        assetId={marketData.assetId}
        assetSymbol={assetSymbol}
        activeAssetData={activeAssetData}
        isLoadingAssetData={isLoadingAssetData}
      />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs assetId={marketData.assetId} />

      {/* Market Selector Modal */}
      <MarketSelectorModal open={isMarketSelectorOpen} onOpenChange={setMarketSelectorOpen} />
    </YStack>
  );
}
