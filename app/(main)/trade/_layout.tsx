import { CoinInfo } from '@/components/trade/CoinInfo';
import { PerpTabs } from '@/components/trade/PerpTabs';
import { useMarketsStore } from '@/lib/hyperliquid/market';
import { Slot, usePathname, useSegments } from 'expo-router';
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Trade Layout with Fixed Header
 *
 * Architecture:
 * - Store (useMarketsStore) is the single source of truth
 * - Supports deep links: reads URL query params (?coin=BTC) once to initialize store
 * - After initialization, URL is not synced (one-way only)
 * - Market changes update store only, no URL updates
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

  // Zustand store
  const { selectedMarket, setSelectedMarketByCoin } = useMarketsStore();

  // Check if current route is perp trade (for showing CoinInfo and PerpTabs)
  const isPerpTrade = segments[2] === 'perp';

  // Deep link support: read URL query params once to initialize store
  // Example: /trade/perp?coin=BTC
  React.useEffect(() => {
    if (!isPerpTrade) return;

    // Extract query params from pathname
    const [, queryString] = pathname.split('?');
    if (!queryString) return;

    const params = new URLSearchParams(queryString);
    const coinFromUrl = params.get('coin');

    // Only update store if URL has a coin param and it differs from current selection
    if (coinFromUrl && coinFromUrl !== selectedMarket?.coin) {
      setSelectedMarketByCoin(coinFromUrl.toUpperCase());
    }
  }, [pathname, isPerpTrade, setSelectedMarketByCoin, selectedMarket?.coin]);

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
