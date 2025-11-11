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

import { useThemePreference } from '@/lib/riverrun/theme/useThemePreference';
import { useWalletContext, WalletCompositionProvider } from '@/core/composition';
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
import { useAppLifecycle } from '@/lib/riverrun/common/useAppLifecycle';
import { subscriptionManager } from '@/lib/hyperliquid/subscription';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/reactQuery';

// Suppress known WalletConnect warnings during session restoration
LogBox.ignoreLogs(['emitting session_request', 'without any listeners']);

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function WalletInfoDisplay() {
  const { wallet } = useWalletContext();
  const appState = useAppLifecycle();

  // App Lifecycle management for unified subscription system
  // When app goes to background, pause all subscriptions to save battery and data
  // When app comes to foreground, resume all subscriptions
  useEffect(() => {
    if (appState === 'active') {
      void subscriptionManager.resumeAll();
    } else if (appState === 'paused') {
      void subscriptionManager.pauseAll();
    }
  }, [appState]);

  return (
    <>
      <Stack
        screenOptions={{
          freezeOnBlur: true,
          animation: 'default',
          headerShown: false,
          // Ensure screens respect safe area from the root
          contentStyle: {
            backgroundColor: '#111',
          },
        }}
      >
        <Stack.Protected guard={!wallet}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={!!wallet}>
          {/* Tabs group - includes bottom tab navigation layout */}
          <Stack.Screen
            name="(tabs)"
            options={{
              headerShown: false,
            }}
          />
          {/* Full-screen routes - no bottom tab bar */}
          <Stack.Screen
            name="chart/perp/[coin]/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          {/* Modal group - includes settings, deposit, withdraw with safe area handling */}
          <Stack.Screen
            name="(modal)/settings/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(modal)/settings/approval-status/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(modal)/settings/builder-fee-status/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(modal)/settings/agent-status/index"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(modal)/deposit/deposit-hl-bridge"
            options={{
              headerShown: false,
              animation: 'slide_from_right',
            }}
          />
          <Stack.Screen
            name="(modal)/withdraw/withdraw-hl-bridge"
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
        <QueryClientProvider client={queryClient}>
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
              <WalletCompositionProvider>
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
              </WalletCompositionProvider>
            </PrivyProvider>
          </AppKitProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </>
  );
}
