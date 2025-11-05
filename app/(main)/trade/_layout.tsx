import { CoinInfo } from '@/components/trade/coin-info';
import { TradeTypeNav } from '@/components/trade/trade-type-nav';
import { PerpTabs } from '@/components/trade/perp-tabs';
import { Slot, usePathname, useRouter, useSegments } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  interpolate,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';
import { useSelectedCoinStore } from '@/lib/riverrun/store';

const NAV_HEIGHT = 48;

/**
 * Trade Layout with Collapsing Navbar
 *
 * Features:
 * - TradeTypeNav (Perps/Spot/Equities/Swap) at the top
 * - Navbar dims when content scrolls over it
 * - Content translates up to visually cover navbar when scrolling
 * - All elements stay within safe area
 */
export default function TradeLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const pathname = usePathname();
  const router = useRouter();
  const [coinInfoHeight, setCoinInfoHeight] = React.useState(0);

  // Zustand store for selected coin
  const { selectedCoin, setSelectedCoin } = useSelectedCoinStore();

  // Extract trade type and asset from route params
  const tradeType = (segments[2] as 'perp' | 'spot') || 'perp';

  // Extract asset from pathname
  // pathname format: /trade/perp/BTC or /(main)/trade/perp/BTC
  const pathSegments = pathname.split('/').filter(Boolean);
  const assetFromPath = pathSegments[pathSegments.length - 1];
  const assetFromUrl = (assetFromPath || 'BTC').toUpperCase();

  // Check if current route is perp trade (for showing CoinInfo and PerpTabs)
  const isPerpTrade = tradeType === 'perp' && segments[3] !== undefined;

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

  // Track scroll position
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: e => {
      scrollY.value = e.contentOffset.y;
    },
  });

  // Navbar opacity: fade from 1.0 to 0.3 as content scrolls over it
  const navbarOpacity = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, NAV_HEIGHT], [1, 0.3]),
  }));

  // Content translateY: move content up to visually cover navbar
  const contentTransform = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.min(scrollY.value, NAV_HEIGHT) }],
  }));

  return (
    <View style={styles.container}>
      {/* Navbar - Fixed position, always clickable */}
      <View style={{ paddingTop: insets.top }}>
        <Animated.View style={navbarOpacity}>
          <YStack
            height={NAV_HEIGHT}
            borderBottomWidth={1}
            borderBottomColor="$gray8"
            backgroundColor="$gray3"
          >
            <TradeTypeNav currentType={tradeType} asset={displayCoin} />
          </YStack>
        </Animated.View>
      </View>

      {/* Scrollable Content - Translates up when scrolling */}
      <Animated.View style={[styles.scrollContainer, contentTransform]}>
        {/* Sticky CoinInfo Header (for perp trade only) */}
        {isPerpTrade && (
          <View
            style={styles.stickyHeader}
            onLayout={e => setCoinInfoHeight(e.nativeEvent.layout.height)}
          >
            <CoinInfo coin={displayCoin} />
          </View>
        )}

        {/* Scrollable Content */}
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={true}
          contentContainerStyle={isPerpTrade ? { paddingTop: coinInfoHeight } : undefined}
        >
          <Slot />

          {/* PerpTabs - Inside ScrollView for full-page scrolling, still persists across market switches */}
          {isPerpTrade && <PerpTabs />}
        </Animated.ScrollView>
      </Animated.View>
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
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    backgroundColor: '#111',
  },
});
