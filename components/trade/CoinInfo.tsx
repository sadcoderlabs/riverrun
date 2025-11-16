import { MarketSelectorModal } from '@/components/trade/MarketSelectorModal';
import { useMarketStore } from '@/core/app-internal';
import type { SelectedMarket } from '@/core/contexts/market/ports/types';
import { CandlestickChart, Menu } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, XStack, YStack } from 'tamagui';

/**
 * Internal component that renders coin info with guaranteed selectedMarket
 */
function CoinInfoContent({ selectedMarket }: { selectedMarket: SelectedMarket }) {
  const router = useRouter();
  const [isMarketSelectorOpen, setMarketSelectorOpen] = useState(false);

  // Extract market data (no fallback needed - selectedMarket is guaranteed to exist)
  const { coin, marketPair } = selectedMarket;

  return (
    <>
      <YStack paddingHorizontal="$3" paddingTop="$2.5" paddingBottom="$2">
        {/* Single row with market selector and chart icon */}
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

          {/* Right side: Chart icon */}
          <XStack
            onPress={() => {
              router.push(`/chart/perp/${coin}`);
            }}
            pressStyle={{ opacity: 0.7 }}
          >
            <CandlestickChart size="$1.5" color="$color" />
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
  const selectedMarket = useMarketStore(state => state.selectedMarket);

  // Don't render if no market is selected
  if (!selectedMarket) {
    return null;
  }

  return <CoinInfoContent selectedMarket={selectedMarket} />;
}
