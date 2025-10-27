import { CoinInfo } from '@/components/trade/coin-info';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useLocalSearchParams } from 'expo-router';
import { ScrollView, YStack } from 'tamagui';

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section with Chart - Fixed at top */}
      <CoinInfo coin={coin} />

      {/* Scrollable content */}
      <ScrollView flex={1}>
        <YStack>
          {/* PERP Trade Panel - includes Order Book and Place Order UI */}
          <PerpTradePanel coin={coin} />

          {/* PERP Tabs - Orders, Positions, History */}
          <PerpTabs />
        </YStack>
      </ScrollView>
    </YStack>
  );
}
