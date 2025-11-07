import { appKit } from '@/lib/reown/appKitConfig';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';

import { tamaguiConfig } from '@/tamagui.config';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { useThemePreference } from '@/lib/riverrun/hooks';
import { useActiveWallet } from '@/lib/riverrun/wallet';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PrivyProvider } from '@privy-io/expo';
import { PrivyElements } from '@privy-io/expo/ui';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { TamaguiProvider, View } from 'tamagui';
import { arbitrum } from 'viem/chains';

// Suppress known WalletConnect warnings during session restoration
LogBox.ignoreLogs(['emitting session_request', 'without any listeners']);

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function WalletInfoDisplay() {
  const { isReady, wallet } = useActiveWallet();

  // Wait for wallet providers to be ready before showing content
  if (!isReady) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          freezeOnBlur: true,
          animation: 'default',
          headerShown: false,
        }}
      >
        <Stack.Protected guard={!wallet}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!wallet}>
          {/* Main group - includes bottom navigation layout */}
          <Stack.Screen
            name="(main)"
            options={{
              headerShown: false,
            }}
          />
          {/* Chart route - full screen without bottom navigation */}
          <Stack.Screen
            name="chart/perp/[coin]/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          {/* Settings route - full screen without bottom navigation */}
          <Stack.Screen
            name="settings/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  // Load the Inter fonts
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Get the effective theme from user preference
  const { effectiveTheme } = useThemePreference();

  // Hide the splash screen once the fonts have loaded
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // If fonts are still loading, don't render anything
  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <>
      <SafeAreaProvider>
        <AppKitProvider instance={appKit}>
          <PrivyProvider
            appId="cmhaalv5t00jmjt0dyv6yby9h"
            clientId="client-WY6SSrDi1gWJqto3F2v88JkVeyd9aJJpCUweNA1dhFF92"
            supportedChains={[arbitrum]}
            config={{
              embedded: {
                ethereum: {
                  createOnLogin: 'users-without-wallets',
                },
              },
            }}
          >
            <TamaguiProvider config={tamaguiConfig} defaultTheme={effectiveTheme}>
              <GestureHandlerRootView>
                <ActionSheetProvider>
                  <View style={{ flex: 1 }}>
                    <WalletInfoDisplay />
                  </View>
                </ActionSheetProvider>
                <Toaster />
              </GestureHandlerRootView>
              <PrivyElements />
            </TamaguiProvider>
            <AppKit />
          </PrivyProvider>
        </AppKitProvider>
      </SafeAreaProvider>
    </>
  );
}
