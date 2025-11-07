import { MarketSelectorModal } from '@/components/trade/MarketSelectorModal';
import { useActiveAssetCtx, useHyperliquidClient } from '@/lib/hyperliquid/hooks';
import { formatMarketId } from '@/lib/hyperliquid/marketUtils';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { useMarketsStore } from '@/lib/riverrun/store/useMarketsStore';
import { CandlestickChart, Menu } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

interface CoinInfoProps {
  coin: string;
}

export function CoinInfo({ coin }: CoinInfoProps) {
  const router = useRouter();
  const { getSymbolConverter } = useHyperliquidClient();

  // Use modal state from Zustand store
  const { isMarketSelectorOpen, setMarketSelectorOpen } = useMarketsStore();

  // Format market display (e.g., "BTC-USD")
  const marketDisplay = useMemo(() => formatMarketId(coin, 'perp'), [coin]);

  // Subscribe to real-time asset context data
  const { data: assetCtx } = useActiveAssetCtx({ coin });

  // Fetch szDecimals for proper price formatting
  const [szDecimals, setSzDecimals] = useState<number | undefined>(undefined);

  useEffect(() => {
    const fetchSzDecimals = async () => {
      const converter = await getSymbolConverter();
      const decimals = converter.getSzDecimals(coin);
      if (decimals !== undefined) {
        setSzDecimals(decimals);
      }
    };
    fetchSzDecimals();
  }, [coin, getSymbolConverter]);

  // Calculate market data from real-time WebSocket data
  const marketData = useMemo(() => {
    if (!assetCtx) {
      return {
        price: 0,
        priceChange: 0,
        fundingRate: 0,
      };
    }

    // Use midPx (midpoint between best bid and ask) to match OrderBook pricing
    // Fallback to markPx if midPx is unavailable
    const midPx = parseFloat(assetCtx.ctx.midPx || assetCtx.ctx.markPx);
    const prevDayPx = parseFloat(assetCtx.ctx.prevDayPx);
    const funding = parseFloat(assetCtx.ctx.funding);

    // Calculate 24h price change percentage
    const priceChange = prevDayPx > 0 ? ((midPx - prevDayPx) / prevDayPx) * 100 : 0;

    // Convert funding to percentage (funding is already a decimal, multiply by 100)
    const fundingRate = funding * 100;

    return {
      price: midPx,
      priceChange,
      fundingRate,
    };
  }, [assetCtx]);

  // Determine if price change is positive or negative
  const isPriceUp = marketData.priceChange >= 0;

  // Determine if funding rate is positive or negative
  const isFundingPositive = marketData.fundingRate >= 0;

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
                $
                {szDecimals !== undefined
                  ? formatPrice(marketData.price, szDecimals, true)
                  : marketData.price.toFixed(2)}
              </Text>
              <Text fontFamily="$interMedium" fontSize="$4" color={isPriceUp ? '$green9' : '$red9'}>
                {isPriceUp ? '+' : ''}
                {marketData.priceChange.toFixed(2)}%
              </Text>
            </XStack>
          </YStack>

          {/* Right side: Chart icon and Funding info stacked vertically */}
          <YStack gap="$1.5" justifyContent="space-between" alignItems="flex-end">
            {/* Chart icon - opens full-screen chart page */}
            <XStack
              onPress={() => {
                router.push(`/chart/perp/${coin}`);
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
              <Text
                fontFamily="$interSemiBold"
                fontSize="$3"
                color={isFundingPositive ? '$green9' : '$red9'}
              >
                {isFundingPositive ? '+' : ''}
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
