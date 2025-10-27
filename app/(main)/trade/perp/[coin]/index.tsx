import { AssetInfo } from '@/components/trade/asset-info';
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
  const { coin } = useLocalSearchParams<{ coin: string }>();

  // Get coin name and assetId (index in Hyperliquid)
  const coinName = coin || 'BTC';
  const assetId = useMemo(() => ASSET_INDEX_MAP[coinName.toUpperCase()] ?? 0, [coinName]);

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin: coinName,
  });

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section with Chart */}
      <AssetInfo assetSymbol={coinName} />

      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel
        assetId={assetId}
        assetSymbol={coinName}
        activeAssetData={activeAssetData}
        isLoadingAssetData={isLoadingAssetData}
      />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs assetId={assetId} />
    </YStack>
  );
}
