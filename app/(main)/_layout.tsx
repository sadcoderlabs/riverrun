import { NavBar } from '@/components/global/nav-bar';
import { Stack } from 'expo-router';
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
 */
export default function MainLayout() {
  const insets = useSafeAreaInsets();

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Content from child routes (Home, Trade, Settings, etc.) */}
      <YStack
        flex={1}
        paddingBottom={60 + insets.bottom} // Space for NavBar
      >
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="settings" options={{ headerShown: true, title: 'Settings' }} />
          <Stack.Screen
            name="theme-options"
            options={{ headerShown: true, title: 'Theme Options' }}
          />
          <Stack.Screen name="trade" />
          <Stack.Screen name="close-position" options={{ presentation: 'modal' }} />
          <Stack.Screen name="set-tp-sl" options={{ presentation: 'modal' }} />
        </Stack>
      </YStack>

      {/* Bottom Navigation Bar - Always visible */}
      <NavBar />
    </YStack>
  );
}
