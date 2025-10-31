import { TradeTypeNav } from '@/components/trade/trade-type-nav';
import { Slot, useLocalSearchParams, useSegments } from 'expo-router';
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
  const params = useLocalSearchParams();

  // Extract trade type and asset from route params
  const tradeType = (segments[2] as 'perp' | 'spot') || 'perp';
  const asset =
    (params.coin as string) || (params.market as string) || (params.asset as string) || 'BTC';

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
        <Animated.ScrollView
          onScroll={onScroll}
          scrollEventThrottle={16}
          contentInsetAdjustmentBehavior="never"
          showsVerticalScrollIndicator={true}
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
});
