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
  const { asset } = useLocalSearchParams<{ asset: string }>();

  // Get asset name and assetId (index in Hyperliquid)
  const assetSymbol = asset || 'BTC';
  const assetId = useMemo(() => ASSET_INDEX_MAP[assetSymbol.toUpperCase()] ?? 0, [assetSymbol]);

  // Subscribe to active asset data (leverage, margin mode) from WebSocket
  const { data: activeAssetData, isLoading: isLoadingAssetData } = useActiveAssetData({
    coin: assetSymbol,
  });

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Market Information Section with Chart */}
      <AssetInfo assetSymbol={assetSymbol} />

      {/* PERP Trade Panel - includes Order Book and Place Order UI */}
      <PerpTradePanel
        assetId={assetId}
        assetSymbol={assetSymbol}
        activeAssetData={activeAssetData}
        isLoadingAssetData={isLoadingAssetData}
      />

      {/* PERP Tabs - Orders, Positions, History */}
      <PerpTabs assetId={assetId} />
    </YStack>
  );
}
