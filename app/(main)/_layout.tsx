import { NavBar } from '@/components/global/NavBar';
import { WebData2Provider } from '@/lib/hyperliquid/context/WebData2Context';
import { useMarketsStore } from '@/lib/hyperliquid/market';
import { Stack } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { YStack } from 'tamagui';

/**
 * Main Layout
 *
 * Responsibility: Provide bottom navigation (Home/Trade) for all main app pages
 * This layout wraps all pages in the (main) group and adds:
 * - Bottom navigation bar (Home, Trade)
 * - Safe area padding for bottom
 * - Background color
 * - Market data initialization (once at app level)
 */
export default function MainLayout() {
  const insets = useSafeAreaInsets();
  const refresh = useMarketsStore(state => state.refresh);
  const hasInitialized = useRef(false);

  // Initialize market data once at app level
  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;

      // Always refresh in background to get latest data
      // If we have persisted data, it's already visible (instant UX)
      refresh().catch(err => {
        console.error('Failed to refresh markets:', err);
      });
    }
  }, [refresh]);

  return (
    <WebData2Provider>
      <YStack flex={1} backgroundColor="$gray3">
        {/* Content from child routes (Home, Trade, Settings, etc.) */}
        <YStack
          flex={1}
          paddingBottom={60 + insets.bottom} // Space for NavBar
        >
          <Stack
            initialRouteName="home"
            screenOptions={{
              headerShown: false,
              animation: 'none',
            }}
          >
            <Stack.Screen name="home" />
            <Stack.Screen name="trade" />
          </Stack>
        </YStack>

        {/* Bottom Navigation Bar - Always visible */}
        <NavBar />
      </YStack>
    </WebData2Provider>
  );
}
