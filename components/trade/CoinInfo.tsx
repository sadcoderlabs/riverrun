import { MarketSelectorModal } from '@/components/trade/MarketSelectorModal';
import { useActiveAssetCtx, useMarketsStore, type SelectedMarket } from '@/lib/hyperliquid/market';
import { CandlestickChart, Menu } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

/**
 * Internal component that renders coin info with guaranteed selectedMarket
 */
function CoinInfoContent({ selectedMarket }: { selectedMarket: SelectedMarket }) {
  const router = useRouter();
  const [isMarketSelectorOpen, setMarketSelectorOpen] = useState(false);

  // Extract market data (no fallback needed - selectedMarket is guaranteed to exist)
  const { coin, marketPair } = selectedMarket;

  // Subscribe to real-time asset context data
  const { data: assetCtx } = useActiveAssetCtx({ coin });

  // Calculate funding rate from real-time WebSocket data
  const fundingRate = useMemo(() => {
    if (!assetCtx) {
      return 0;
    }

    const funding = parseFloat(assetCtx.ctx.funding);
    // Convert funding to percentage (funding is already a decimal, multiply by 100)
    return funding * 100;
  }, [assetCtx]);

  // Determine if funding rate is positive or negative
  const isFundingPositive = fundingRate >= 0;

  return (
    <>
      <YStack paddingHorizontal="$3" paddingTop="$2.5" paddingBottom="$2">
        {/* Single row with market selector, funding, and chart icon */}
        <XStack justifyContent="space-between" alignItems="center">
          {/* Left side: Market selector */}
          <XStack
            alignItems="center"
            gap="$2"
            onPress={() => setMarketSelectorOpen(true)}
            pressStyle={{ opacity: 0.7 }}
          >
            <Menu size="$1.5" color="$color" />
            <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
              {marketPair}
            </Text>
          </XStack>

          {/* Right side: Funding info and Chart icon */}
          <XStack gap="$3" alignItems="center">
            {/* Funding info */}
            <YStack alignItems="flex-end" gap="$0.5">
              <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
                Funding
              </Text>
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={isFundingPositive ? '$green9' : '$red9'}
              >
                {isFundingPositive ? '+' : ''}
                {fundingRate.toFixed(4)}%
              </Text>
            </YStack>

            {/* Chart icon - opens full-screen chart page */}
            <XStack
              onPress={() => {
                router.push(`/chart/perp/${coin}`);
              }}
              pressStyle={{ opacity: 0.7 }}
            >
              <CandlestickChart size="$1.5" color="$color" />
            </XStack>
          </XStack>
        </XStack>
      </YStack>

      {/* Market Selector Modal */}
      <MarketSelectorModal open={isMarketSelectorOpen} onOpenChange={setMarketSelectorOpen} />
    </>
  );
}

/**
 * Wrapper component that handles selectedMarket availability
 * Prevents rendering CoinInfoContent in invalid state
 */
export function CoinInfo() {
  const { selectedMarket } = useMarketsStore();

  // Don't render if no market is selected
  if (!selectedMarket) {
    return null;
  }

  return <CoinInfoContent selectedMarket={selectedMarket} />;
}
