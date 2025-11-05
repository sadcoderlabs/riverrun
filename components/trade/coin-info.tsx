import { MarketSelectorModal } from '@/components/trade/market-selector-modal';
import { useActiveAssetCtx } from '@/lib/hyperliquid/hooks';
import { formatMarketId } from '@/lib/hyperliquid/market-utils';
import { useMarketsStore } from '@/lib/riverrun/store/use-markets-store';
import { CandlestickChart, Menu } from '@tamagui/lucide-icons';
import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';

interface CoinInfoProps {
  coin: string;
}

export function CoinInfo({ coin }: CoinInfoProps) {
  // Use modal state from Zustand store
  const { isMarketSelectorOpen, setMarketSelectorOpen } = useMarketsStore();

  // Format market display (e.g., "BTC-USD")
  const marketDisplay = useMemo(() => formatMarketId(coin, 'perp'), [coin]);

  // Subscribe to real-time asset context data
  const { data: assetCtx } = useActiveAssetCtx({ coin });

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
      <YStack paddingHorizontal="$3" paddingTop="$2.5" paddingBottom="$2">
        {/* Single row with left and right stacks */}
        <XStack justifyContent="space-between" alignItems="stretch">
          {/* Left side: Market selector and Price info stacked vertically */}
          <YStack gap="$1.5" justifyContent="space-between" flex={1}>
            {/* Market selector */}
            <XStack
              alignItems="center"
              gap="$2"
              onPress={() => setMarketSelectorOpen(true)}
              pressStyle={{ opacity: 0.7 }}
            >
              <Menu size="$1.5" color="$color" />
              <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
                {marketDisplay}
              </Text>
            </XStack>

            {/* Price info */}
            <XStack gap="$2" alignItems="baseline">
              <Text fontFamily="$interSemiBold" fontSize="$6" color="$color">
                ${formatPrice(marketData.price)}
              </Text>
              <Text fontFamily="$interMedium" fontSize="$4" color={isPriceUp ? '$green9' : '$red9'}>
                {isPriceUp ? '+' : ''}
                {marketData.priceChange.toFixed(2)}%
              </Text>
            </XStack>
          </YStack>

          {/* Right side: Chart icon and Funding info stacked vertically */}
          <YStack gap="$1.5" justifyContent="space-between" alignItems="flex-end">
            {/* Chart icon - placeholder for future functionality */}
            <XStack
              onPress={() => {
                // TODO: Implement chart functionality
              }}
              pressStyle={{ opacity: 0.7 }}
            >
              <CandlestickChart size="$1.5" color="$color" />
            </XStack>

            {/* Funding info */}
            <YStack alignItems="flex-end" gap="$0.5">
              <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                Funding
              </Text>
              <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
                {marketData.fundingRate.toFixed(4)}%
              </Text>
            </YStack>
          </YStack>
        </XStack>
      </YStack>

      {/* Market Selector Modal */}
      <MarketSelectorModal open={isMarketSelectorOpen} onOpenChange={setMarketSelectorOpen} />
    </>
  );
}
