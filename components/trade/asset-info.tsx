import { ChartUI } from '@/components/trade/chart-ui';
import { MarketSelectorModal } from '@/components/trade/market-selector-modal';
import { useActiveAssetCtx } from '@/hooks/useActiveAssetCtx';
import { formatMarketId } from '@/lib/hyperliquid/market-utils';
import { useMarketsStore } from '@/lib/store/use-markets-store';
import { CandlestickChart, ChevronUp, Menu } from '@tamagui/lucide-icons';
import { useMemo, useState } from 'react';
import { AnimatePresence, Text, XStack, YStack } from 'tamagui';

interface AssetInfoProps {
  assetSymbol: string;
}

export function AssetInfo({ assetSymbol }: AssetInfoProps) {
  // Use modal state from Zustand store
  const { isMarketSelectorOpen, setMarketSelectorOpen } = useMarketsStore();

  // Chart state
  const [isChart, setIsChart] = useState(false);

  // Format market display (e.g., "BTC-USD")
  const marketDisplay = formatMarketId(assetSymbol, 'perp');

  // Subscribe to real-time asset context data
  const { data: assetCtx, isLoading, error } = useActiveAssetCtx({ coin: assetSymbol });

  // Calculate market data from real-time WebSocket data
  const marketData = useMemo(() => {
    if (!assetCtx) {
      return {
        price: 0,
        priceChange: 0,
        fundingRate: 0,
      };
    }

    const markPx = parseFloat(assetCtx.ctx.markPx);
    const prevDayPx = parseFloat(assetCtx.ctx.prevDayPx);
    const funding = parseFloat(assetCtx.ctx.funding);

    // Calculate 24h price change percentage
    const priceChange = prevDayPx > 0 ? ((markPx - prevDayPx) / prevDayPx) * 100 : 0;

    // Convert funding to percentage (funding is already a decimal, multiply by 100)
    const fundingRate = funding * 100;

    return {
      price: markPx,
      priceChange,
      fundingRate,
    };
  }, [assetCtx]);

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
    <>
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
              {marketDisplay}
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
              {marketData.priceChange.toFixed(2)}%
            </Text>
          </XStack>
          <YStack alignItems="flex-end">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Funding
            </Text>
            <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
              {marketData.fundingRate.toFixed(4)}%
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
            <ChartUI marketId={marketDisplay} />
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

      {/* Market Selector Modal */}
      <MarketSelectorModal open={isMarketSelectorOpen} onOpenChange={setMarketSelectorOpen} />
    </>
  );
}
