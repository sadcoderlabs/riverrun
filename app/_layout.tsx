import { tamaguiConfig } from '@/tamagui.config';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { SplashScreen, Stack } from 'expo-router';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { TamaguiProvider, View } from 'tamagui';

// make sure import @walletconnect/react-native-compat before wagmi to avoid issues
import '@walletconnect/react-native-compat';

import {
  AppKit,
  createAppKit,
  defaultWagmiConfig,
  useWalletInfo,
} from '@reown/appkit-wagmi-react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { arbitrum, mainnet } from '@wagmi/core/chains';
import { WagmiProvider } from 'wagmi';

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// 0. Setup queryClient
const queryClient = new QueryClient();

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

const chains = [mainnet, arbitrum] as const;

const wagmiConfig = defaultWagmiConfig({ chains, projectId, metadata });

// 3. Create modal
createAppKit({
  projectId,
  metadata,
  wagmiConfig,
  defaultChain: mainnet, // Optional
  enableAnalytics: true, // Optional - defaults to your Cloud configuration
});

const isConnected = false;
// Create a child component that uses the wallet info hook
function WalletInfoDisplay() {
  const { walletInfo } = useWalletInfo();
  console.log(walletInfo);

  return (
    <>
      <Stack>
        <Stack.Protected guard={!isConnected}>
          <Stack.Screen name="login" options={{ headerShown: false }} />
        </Stack.Protected>
        <Stack.Protected guard={isConnected}>
          <Stack.Screen name="(main)/index" options={{ headerShown: false }} />
          <Stack.Screen name="(main)/settings" />
          <Stack.Screen name="(main)/trade/market-list" />
          <Stack.Screen name="(main)/trade/[market]" options={{ headerShown: false }} />
        </Stack.Protected>
      </Stack>
      <AppKit />
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
    <TamaguiProvider config={tamaguiConfig}>
      <SafeAreaProvider>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <View style={{ flex: 1 }}>
              <WalletInfoDisplay />
              <AppKit />
            </View>
          </QueryClientProvider>
        </WagmiProvider>
      </SafeAreaProvider>
    </TamaguiProvider>
  );
}
