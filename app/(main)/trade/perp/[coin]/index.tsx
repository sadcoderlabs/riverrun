import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { YStack } from 'tamagui';
import { useSelectedCoinStore } from '@/lib/riverrun/store';

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();
  const { selectedCoin, setSelectedCoin } = useSelectedCoinStore();

  // Sync initial URL param to store on mount
  useEffect(() => {
    if (coin && coin !== selectedCoin) {
      setSelectedCoin(coin as string);
    }
  }, [coin, selectedCoin, setSelectedCoin]);

  // Use selectedCoin from store, fallback to URL param
  const displayCoin = selectedCoin || (coin as string);

  return (
    <YStack backgroundColor="$gray3">
      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel coin={displayCoin} />

      {/* PERP Tabs moved to Layout - now rendered at bottom of screen, persists across market switches */}
    </YStack>
  );
}
