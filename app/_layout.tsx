import { appKit } from '@/infra/reown/appKitConfig';
import { AppKit, AppKitProvider } from '@reown/appkit-react-native';

import { tamaguiConfig } from '@/tamagui.config';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { AppCompositionProvider, useWallet } from '@/app-internal';
import { useAppLifecycle } from '@/app-internal/components/shared/hooks/useAppLifecycle';
import { useThemePreference } from '@/app-internal/components/shared/theme/useThemePreference';
import { useAutoUpdate } from '@/app-internal/features/version/hooks/useAutoUpdate';
import { useCustomerSupportWalletSync } from '@/app-internal/features/customerSupport';
import { subscriptionManager } from '@/infra/hyperliquid/subscription';
import { queryClient } from '@/infra/reactQuery';
import { initializeSegment } from '@/infra/segment/segmentConfig';
import { initializeSentry } from '@/infra/sentry/sentryConfig';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PrivyProvider } from '@privy-io/expo';
import { PrivyElements } from '@privy-io/expo/ui';
import { QueryClientProvider } from '@tanstack/react-query';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { TamaguiProvider, View } from 'tamagui';
import { arbitrum } from 'viem/chains';

// Initialize Sentry for error tracking, performance monitoring, and session replay
// Must be called before any other code runs
initializeSentry();

// Initialize Segment for analytics tracking (forwarded to Amplitude)
// Should be called after Sentry initialization
initializeSegment();

// Note: Intercom uses manual initialization (lazy initialization)
// It will be initialized automatically when the user first opens the support messenger

// Suppress known warnings
LogBox.ignoreLogs([
  // WalletConnect warnings during session restoration
  'emitting session_request',
  'without any listeners',
]);

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function WalletInfoDisplay() {
  const { wallet } = useWallet();
  const appState = useAppLifecycle();

  // Automatic OTA update check on cold boot (preview/production builds only)
  useAutoUpdate();

  // Sync wallet state with customer support (Intercom)
  // Automatically identifies user when wallet connects and logs out when disconnects
  useCustomerSupportWalletSync();

  // App Lifecycle management for subscription systems
  // When app goes to background, pause all subscriptions to save battery and data
  // When app comes to foreground, resume all subscriptions
  useEffect(() => {
    if (appState === 'active') {
      // Resume Hyperliquid subscriptions
      void subscriptionManager.resumeAll();

      // Force Privy wallet reconnection after background
      // Privy's embedded wallet WebSocket times out in background, so we need to
      // trigger reconnection by calling getProvider() when app returns to foreground
      if (wallet?.type === 'privy') {
        void (async () => {
          try {
            // Getting provider forces Privy to reconnect its internal WebSocket
            await wallet.getProvider();
          } catch (error) {
            // Log warning but don't block app startup
            console.warn('[WalletInfoDisplay] Failed to refresh Privy connection:', error);
          }
        })();
      }
    } else if (appState === 'paused' || appState === 'suspended') {
      // Pause subscriptions for both paused (recent) and suspended (>30s) states
      void subscriptionManager.pauseAll();
    }
  }, [appState, wallet]);

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
            name="(modal)"
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
              <AppCompositionProvider>
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
              </AppCompositionProvider>
            </PrivyProvider>
          </AppKitProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </>
  );
}
