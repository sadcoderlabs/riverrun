import { CoinInfo } from '@/components/trade/coin-info';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSelectedCoinStore } from '@/lib/riverrun/store';

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

  // Zustand store for selected coin
  const { selectedCoin, setSelectedCoin } = useSelectedCoinStore();

  // Extract asset from pathname
  // pathname format: /trade/perp/BTC or /(main)/trade/perp/BTC
  const pathSegments = pathname.split('/').filter(Boolean);
  const assetFromPath = pathSegments[pathSegments.length - 1];
  const assetFromUrl = (assetFromPath || 'BTC').toUpperCase();

  // Check if current route is perp trade (for showing CoinInfo and PerpTabs)
  const isPerpTrade = segments[2] === 'perp' && segments[3] !== undefined;

  // Track previous values to detect which source changed
  const prevAssetFromUrlRef = React.useRef(assetFromUrl);
  const prevSelectedCoinRef = React.useRef(selectedCoin);

  // Bidirectional sync between URL and store
  React.useEffect(() => {
    if (!isPerpTrade) return;

    const urlChanged = assetFromUrl !== prevAssetFromUrlRef.current;
    const storeChanged = selectedCoin !== prevSelectedCoinRef.current;

    if (urlChanged && !storeChanged) {
      // URL changed (browser navigation) → update store
      console.log('[TradeLayout] URL changed, syncing to store:', assetFromUrl);
      setSelectedCoin(assetFromUrl);
    } else if (storeChanged && !urlChanged) {
      // Store changed (user interaction) → update URL
      console.log('[TradeLayout] Store changed, syncing to URL:', selectedCoin);
      router.setParams({ coin: selectedCoin });
    }

    // Update refs after sync
    prevAssetFromUrlRef.current = assetFromUrl;
    prevSelectedCoinRef.current = selectedCoin;
  }, [assetFromUrl, selectedCoin, isPerpTrade, setSelectedCoin, router]);

  // Use selectedCoin for display, fallback to assetFromUrl
  const displayCoin = selectedCoin || assetFromUrl;

  return (
    <View style={styles.container}>
      {/* Safe area spacing */}
      <View style={{ height: insets.top, backgroundColor: '#111' }} />

      {/* Fixed CoinInfo Header */}
      {isPerpTrade && (
        <View style={styles.fixedHeader}>
          <CoinInfo coin={displayCoin} />
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
