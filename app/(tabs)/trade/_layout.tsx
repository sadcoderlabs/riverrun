import { CoinInfo } from '@/app-internal/components/trade/CoinInfo';
import { PerpTabs } from '@/app-internal/components/trade/PerpTabs';
import { useMarketStore, useMarket } from '@/app-internal';
import { Slot, usePathname } from 'expo-router';
import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

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
 * - CoinInfo fixed at the top (always shown)
 * - Scrollable content below
 * - PerpTabs at the bottom (always shown)
 * - Safe area is handled by parent layout
 */
export default function TradeLayout() {
  const pathname = usePathname();

  // State access
  const selectedMarket = useMarketStore(state => state.selectedMarket);
  // Business operations
  const { setSelectedMarketByCoin } = useMarket();

  // Deep link support: read URL query params once to initialize store
  // Example: /trade/perp?coin=BTC
  React.useEffect(() => {
    // Extract query params from pathname
    const [, queryString] = pathname.split('?');
    if (!queryString) return;

    const params = new URLSearchParams(queryString);
    const coinFromUrl = params.get('coin');

    // Only update store if URL has a coin param and it differs from current selection
    if (coinFromUrl && coinFromUrl !== selectedMarket?.coin) {
      setSelectedMarketByCoin(coinFromUrl.toUpperCase());
    }
  }, [pathname, setSelectedMarketByCoin, selectedMarket?.coin]);

  return (
    <View style={styles.container}>
      {/* Fixed CoinInfo Header */}
      <View style={styles.fixedHeader}>
        <CoinInfo />
      </View>

      {/* Scrollable Content */}
      <ScrollView
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={true}
        style={styles.scrollContainer}
      >
        <Slot />

        {/* PerpTabs - Inside ScrollView for full-page scrolling, still persists across market switches */}
        <PerpTabs />
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
