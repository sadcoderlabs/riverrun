import { WebData2Provider } from '@/lib/hyperliquid/context/WebData2Context';
import { useMarketsStore } from '@/lib/hyperliquid/market';
import { Home, TrendingUp } from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';
import { useEffect, useRef } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, YStack } from 'tamagui';

/**
 * Tabs Layout
 *
 * Responsibility: Provide bottom tab navigation (Home/Trade) for main app
 * This layout wraps all pages in the (tabs) group and adds:
 * - Bottom tab bar (Home, Trade) using Expo Router Tabs
 * - Safe area handling (top and bottom)
 * - Market data initialization (once at app level)
 * - WebData2Provider for real-time market data
 *
 * Benefits over Stack navigation:
 * - Proper unmounting of inactive tabs (fixes memory leaks)
 * - Native tab bar behavior
 * - Better performance and UX
 */
export default function TabsLayout() {
  const refresh = useMarketsStore(state => state.refresh);
  const hasInitialized = useRef(false);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

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
        {/* Top safe area */}
        <YStack height={insets.top} backgroundColor="$gray3" />

        {/* Tab navigation */}
        <Tabs
          screenOptions={{
            headerShown: false,
            // Ensure content doesn't go under tab bar
            sceneStyle: {
              backgroundColor: theme.gray3.val,
            },
            tabBarStyle: {
              backgroundColor: theme.background.val,
              borderTopColor: theme.borderColor.val,
              borderTopWidth: 1,
              // Respect safe area: 60px base height + bottom inset
              height: 60 + insets.bottom,
              paddingBottom: insets.bottom > 0 ? insets.bottom : 8,
              paddingTop: 8,
            },
            tabBarActiveTintColor: theme.accent9.val,
            tabBarInactiveTintColor: theme.color9.val,
            tabBarLabelStyle: {
              fontSize: 12,
              fontFamily: 'InterMedium',
            },
          }}
        >
          <Tabs.Screen
            name="home"
            options={{
              title: 'Home',
              tabBarIcon: ({ color, size }) => (
                // @ts-expect-error - React Navigation's color type is string, Tamagui expects specific type
                <Home size={size} color={color} />
              ),
            }}
          />
          <Tabs.Screen
            name="trade"
            options={{
              title: 'Trade',
              tabBarIcon: ({ color, size }) => (
                // @ts-expect-error - React Navigation's color type is string, Tamagui expects specific type
                <TrendingUp size={size} color={color} />
              ),
            }}
          />
        </Tabs>
      </YStack>
    </WebData2Provider>
  );
}
