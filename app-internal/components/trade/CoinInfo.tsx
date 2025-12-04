import { useMarketStore } from '@/app-internal';
import { MarketSelectorModal } from '@/app-internal/components/trade/MarketSelectorModal';
import type { SelectedMarket } from '@/contexts/market/ports/types';
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
  const { coin, marketPair, isHip3, dex } = selectedMarket;

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
            {isHip3 && (
              <XStack
                backgroundColor="$color1"
                paddingHorizontal="$1.5"
                paddingVertical="$0.5"
                borderRadius="$2"
                borderWidth={1}
                borderColor="$color12"
              >
                <Text fontSize="$1" fontFamily="$interMedium" color="rgb(80, 210, 193)">
                  HIP-3
                </Text>
              </XStack>
            )}
            {dex && (
              <XStack
                backgroundColor="$color1"
                paddingHorizontal="$1.5"
                paddingVertical="$0.5"
                borderRadius="$2"
                borderWidth={1}
                borderColor="$color12"
              >
                <Text fontSize="$1" fontFamily="$interMedium">
                  {dex}
                </Text>
              </XStack>
            )}
          </XStack>

          {/* Right side: Chart icon */}
          <XStack
            onPress={() => {
              router.push({ pathname: '/(modal)/chart', params: { coin } });
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
