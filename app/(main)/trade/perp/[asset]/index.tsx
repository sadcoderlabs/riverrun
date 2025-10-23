import { AssetInfo } from '@/components/trade/asset-info';
import { ChartUI } from '@/components/trade/chart-ui';
import { MarketSelectorModal } from '@/components/trade/market-selector-modal';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useActiveAssetData } from '@/hooks/useActiveAssetData';
import { formatMarketId } from '@/lib/hyperliquid/market-utils';
import { useMarketsStore } from '@/lib/store/use-markets-store';
import { ChevronUp } from '@tamagui/lucide-icons';
import { useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { AnimatePresence, XStack, YStack } from 'tamagui';

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
  });

  // Format market display (e.g., "BTC-USD")
  const marketDisplay = formatMarketId(assetSymbol, 'perp');

  // Hard-coded market data for rendering purposes
  const marketData = {
    assetId,
    assetSymbol,
    marketDisplay,
    price: 28450.75,
    priceChange: 2.34,
    fundingRate: 0.0012, // 0.12% per 8 hours
    annualizedFunding: 10.95, // Annualized percentage
  };

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section */}
      <AssetInfo
        marketDisplay={marketData.marketDisplay}
        price={marketData.price}
        priceChange={marketData.priceChange}
        annualizedFunding={marketData.annualizedFunding}
        isChart={isChart}
        onToggleChart={() => setIsChart(!isChart)}
        onOpenMarketSelector={() => setMarketSelectorOpen(true)}
      />

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
