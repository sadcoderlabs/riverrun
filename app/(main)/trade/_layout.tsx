import { CoinInfo } from '@/components/trade/coin-info';
import { TradeTypeNav } from '@/components/trade/trade-type-nav';
import { Slot, usePathname, useSegments } from 'expo-router';
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
  const [coinInfoHeight, setCoinInfoHeight] = React.useState(0);

  // Extract trade type and asset from route params
  const tradeType = (segments[2] as 'perp' | 'spot') || 'perp';

  // IMPORTANT: Extract asset from pathname directly, NOT from useLocalSearchParams()
  // useLocalSearchParams() can cache old values at the layout level and doesn't update
  // immediately when router.replace() is called. Using pathname ensures we always get
  // the current route value, which is critical for updating CoinInfo when switching markets.
  // pathname format: /trade/perp/BTC or /(main)/trade/perp/BTC
  const pathSegments = pathname.split('/').filter(Boolean);
  const assetFromPath = pathSegments[pathSegments.length - 1];
  const asset = (assetFromPath || 'BTC').toUpperCase();

  // Check if current route is perp trade (for showing CoinInfo)
  const isPerpTrade = tradeType === 'perp' && segments[3] !== undefined;

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
            <TradeTypeNav currentType={tradeType} asset={asset} />
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
            <CoinInfo coin={asset} />
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
