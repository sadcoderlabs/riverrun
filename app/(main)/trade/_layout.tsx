import { CoinInfo } from '@/components/trade/CoinInfo';
import { PerpTabs } from '@/components/trade/PerpTabs';
import { useMarketsStore } from '@/lib/hyperliquid/market';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Trade Layout with Fixed Header
 *
 * Features:
 * - CoinInfo fixed at the top
 * - Scrollable content below
 * - All elements stay within safe area
 */
export default function TradeLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();

  // Zustand store
  const { selectedMarket, setSelectedMarketByCoin, markets } = useMarketsStore();

  // Extract asset from pathname
  // pathname format: /trade/perp/BTC or /(main)/trade/perp/BTC
  const pathSegments = pathname.split('/').filter(Boolean);
  const assetFromPath = pathSegments[pathSegments.length - 1];
  const assetFromUrl = (assetFromPath || 'BTC').toUpperCase();

  // Check if current route is perp trade (for showing CoinInfo and PerpTabs)
  const isPerpTrade = segments[2] === 'perp' && segments[3] !== undefined;

  // Track previous values to detect which source changed
  const prevAssetFromUrlRef = React.useRef(assetFromUrl);
  const prevSelectedCoinRef = React.useRef(selectedMarket?.coin);

  // Bidirectional sync between URL and store
  React.useEffect(() => {
    if (!isPerpTrade) return;

    const selectedCoin = selectedMarket?.coin;
    const urlChanged = assetFromUrl !== prevAssetFromUrlRef.current;
    const storeChanged = selectedCoin !== prevSelectedCoinRef.current;

    if (urlChanged && !storeChanged) {
      // URL changed (browser navigation) → update store with complete market info
      console.log('[TradeLayout] URL changed, syncing to store:', assetFromUrl);
      setSelectedMarketByCoin(assetFromUrl);
    } else if (storeChanged && !urlChanged) {
      // Store changed (user interaction) → update URL
      console.log('[TradeLayout] Store changed, syncing to URL:', selectedCoin);
      router.setParams({ coin: selectedCoin });
    }

    // Update refs after sync
    prevAssetFromUrlRef.current = assetFromUrl;
    prevSelectedCoinRef.current = selectedCoin;
  }, [assetFromUrl, isPerpTrade, setSelectedMarketByCoin, router, selectedMarket?.coin]);

  // Use selectedCoin for display, fallback to assetFromUrl
  const displayCoin = selectedMarket?.coin || assetFromUrl;

  return (
    <View style={styles.container}>
      {/* Safe area spacing */}
      <View style={{ height: insets.top, backgroundColor: '#111' }} />

      {/* Fixed CoinInfo Header */}
      {isPerpTrade && (
        <View style={styles.fixedHeader}>
          <CoinInfo />
        </View>
      )}

      {/* Scrollable Content */}
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={true}
        style={styles.scrollContainer}
      >
        <Slot />

        {/* PerpTabs - Inside ScrollView for full-page scrolling, still persists across market switches */}
        {isPerpTrade && <PerpTabs />}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#111',
  },
  scrollContainer: {
    flex: 1,
  },
  fixedHeader: {
    backgroundColor: '#111',
  },
});
