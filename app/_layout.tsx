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

import { ActionSheetProvider } from '@expo/react-native-action-sheet';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, View } from 'tamagui';

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
  return (
    <>
      <Stack>
        <Stack.Protected guard={!isConnected}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isConnected}>
          <Stack.Screen name="(main)/index" options={{ headerShown: false }} />
          <Stack.Screen name="(main)/settings" />
          <Stack.Screen name="(main)/trade/market-list" options={{ headerShown: false }} />
          <Stack.Screen name="(main)/trade/[market]" options={{ headerShown: false }} />
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
      <TamaguiProvider config={tamaguiConfig}>
        <SafeAreaProvider>
          <ActionSheetProvider>
            <View style={{ flex: 1 }}>
              <WalletInfoDisplay />
            </View>
          </ActionSheetProvider>
        </SafeAreaProvider>
      </TamaguiProvider>
      <AppKit />
    </>
  );
}
