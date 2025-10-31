import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useLocalSearchParams } from 'expo-router';
import { YStack } from 'tamagui';

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();

  return (
    <YStack backgroundColor="$gray3">
      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel coin={coin} />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs />
    </YStack>
  );
}
