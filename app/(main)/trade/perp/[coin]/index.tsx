import { CoinInfo } from '@/components/trade/coin-info';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { PerpTradePanel } from '@/components/trade/perp-trade-panel';
import { useActiveAssetData } from '@/hooks/useActiveAssetData';
import { useLocalSearchParams } from 'expo-router';
import { useMemo } from 'react';
import { YStack } from 'tamagui';

// Temporary hardcoded asset mapping (will be replaced with API call)
const ASSET_INDEX_MAP: Record<string, number> = {
  BTC: 0,
  ETH: 1,
  SOL: 2,
  // Add more as needed
};

export default function PerpTradeIndex() {
  const { coin = 'BTC' } = useLocalSearchParams<{ coin: string }>();

  // Get assetId (index in Hyperliquid)
  const assetId = useMemo(() => ASSET_INDEX_MAP[coin.toUpperCase()] ?? 0, [coin]);

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
        assetId={assetId}
        coin={coin}
        activeAssetData={activeAssetData}
        isLoadingAssetData={isLoadingAssetData}
      />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs />
    </YStack>
  );
}
