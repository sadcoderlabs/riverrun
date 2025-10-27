import { CoinInfo } from '@/components/trade/coin-info';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useActiveAssetData } from '@/hooks/useActiveAssetData';
import { useLocalSearchParams } from 'expo-router';
import { YStack } from 'tamagui';

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin,
  });

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section with Chart */}
      <CoinInfo coin={coin} />

      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel
        coin={coin}
        activeAssetData={activeAssetData}
        isLoadingAssetData={isLoadingAssetData}
      />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs />
    </YStack>
  );
}
