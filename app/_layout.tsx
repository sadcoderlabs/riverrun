
import {
  AppKit,
  createAppKit,
  defaultConfig,
  useAppKitAccount,
} from '@reown/appkit-ethers-react-native';

import { tamaguiConfig } from '@/tamagui.config';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

import { useThemePreference } from '@/hooks/useThemePreference';
import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { PrivyProvider, usePrivy } from '@privy-io/expo';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toaster } from 'sonner-native';
import { TamaguiProvider, View } from 'tamagui';

// Suppress known WalletConnect warnings during session restoration
LogBox.ignoreLogs(['emitting session_request', 'without any listeners']);

// 1. Get projectId at https://dashboard.reown.com
const projectId = 'REOWN_PROJECT_ID_REMOVED';

// 2. Create config
const metadata = {
  name: 'Riverrun',
  description: 'A trading app built by perpetual protocol',
  url: 'https://riverrun.perp.com',
  icons: ['https://avatars.githubusercontent.com/u/179229932'],
  redirect: {
    native: 'YOUR_APP_SCHEME://',
    universal: 'YOUR_APP_UNIVERSAL_LINK.com',
  },
};

const mainnet = {
  chainId: 1,
  name: 'Ethereum',
  currency: 'ETH',
  explorerUrl: 'https://etherscan.io',
  rpcUrl: 'https://cloudflare-eth.com',
};

const arbitrum = {
  chainId: 42161,
  name: 'Arbitrum',
  currency: 'ETH',
  explorerUrl: 'https://arbiscan.io',
  rpcUrl: 'https://arb-mainnet.g.alchemy.com/v2/demo',
};

const chains = [mainnet, arbitrum];

const config = defaultConfig({ metadata });

// 3. Create modal
createAppKit({
  projectId,
  metadata,
  chains,
  config,
  defaultChain: mainnet, // Optional
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
});

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

function WalletInfoDisplay() {
  const { isConnected } = useAppKitAccount();
  const { isReady, user } = usePrivy();

  // Wait for Privy to be ready before showing content
  if (!isReady) {
    return null;
  }

  // User is authenticated if they're logged in with Privy OR connected wallet
  const isAuthenticated = !!user || isConnected;

  return (
    <>
      <Stack
        screenOptions={{
          freezeOnBlur: true,
          animation: 'default',
        }}
      >
        <Stack.Protected guard={!isAuthenticated}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isAuthenticated}>
          {/* Main group - includes bottom navigation layout */}
          <Stack.Screen
            name="(main)"
            options={{
              headerShown: false,
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
      <PrivyProvider
        appId="cmhaalv5t00jmjt0dyv6yby9h"
        clientId="client-WY6SSrDi1gWJqto3F2v88JkVeyd9aJJpCUweNA1dhFF92"
      >
        <TamaguiProvider config={tamaguiConfig} defaultTheme={effectiveTheme}>
          <GestureHandlerRootView>
            <SafeAreaProvider>
              <ActionSheetProvider>
                <View style={{ flex: 1 }}>
                  <WalletInfoDisplay />
                </View>
              </ActionSheetProvider>
              <Toaster />
            </SafeAreaProvider>
          </GestureHandlerRootView>
        </TamaguiProvider>
        <AppKit />
      </PrivyProvider>
    </>
  );
}
