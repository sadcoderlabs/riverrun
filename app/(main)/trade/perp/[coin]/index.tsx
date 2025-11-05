import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useLocalSearchParams } from 'expo-router';
import { YStack } from 'tamagui';
import { useSelectedCoinStore } from '@/lib/riverrun/store';

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();
  const { selectedCoin } = useSelectedCoinStore();

  // Use selectedCoin from store, fallback to URL param
  // Note: URL sync is handled by _layout.tsx, not here
  const displayCoin = selectedCoin || (coin as string);

  return (
    <YStack backgroundColor="$gray3">
      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel coin={displayCoin} />

      {/* PERP Tabs moved to Layout - now rendered at bottom of screen, persists across market switches */}
    </YStack>
  );
}
