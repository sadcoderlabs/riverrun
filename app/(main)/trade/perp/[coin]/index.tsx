import { CoinInfo } from '@/components/trade/coin-info';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useLocalSearchParams } from 'expo-router';
import { YStack } from 'tamagui';

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section with Chart */}
      <CoinInfo coin={coin} />

      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel coin={coin} />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs />
    </YStack>
  );
}
