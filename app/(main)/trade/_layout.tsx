import { TradeTypeNav } from '@/components/trade/trade-type-nav';
import { Stack, useLocalSearchParams, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

/**
 * Trade Layout
 *
 * Responsibility: Provide Trade Type Navigation (Perps/Spot/Equities/Swap)
 * This layout is specific to trade pages and adds:
 * - Top navigation for switching between trade types
 * - Safe area padding for top (to account for status bar)
 * - Handles routing for perp/[asset] and spot/[market]
 */
export default function TradeLayout() {
  const insets = useSafeAreaInsets();
  const segments = useSegments();
  const params = useLocalSearchParams();

  // Extract trade type (perp/spot) and asset from segments
  const tradeType = (segments[2] as 'perp' | 'spot') || 'perp';
  const asset = (params.asset as string) || 'BTC';

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Trade Type Navigation - Fixed at top */}
      <YStack
        paddingTop={insets.top}
        borderBottomWidth={1}
        borderBottomColor="$gray8"
        backgroundColor="$gray3"
      >
        <TradeTypeNav currentType={tradeType} asset={asset} />
      </YStack>

      {/* Content from child routes (perp/[asset], spot/[market]) */}
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'none', // Disable navigation animation for instant market switching
        }}
      >
        <Stack.Screen name="perp/[asset]/index" />
        <Stack.Screen name="spot/[market]/(tab)/index" />
      </Stack>
    </YStack>
  );
}
