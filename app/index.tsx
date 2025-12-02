import { useWallet, useWelcomeStore } from '@/app-internal';
import { Redirect } from 'expo-router';
import { Image } from 'react-native';
import { YStack } from 'tamagui';

/**
 * Splash screen shown while app state is loading
 */
function SplashScreen() {
  return (
    <YStack flex={1} backgroundColor="$background" justifyContent="center" alignItems="center">
      <Image
        source={require('@/app-internal/assets/images/splash-icon.png')}
        style={{ width: 200, height: 200 }}
        resizeMode="contain"
      />
    </YStack>
  );
}

export default function Index() {
  const { wallet } = useWallet();
  const shouldShowWelcome = useWelcomeStore(state => state.shouldShowWelcome);
  const hasHydrated = useWelcomeStore(state => state._hasHydrated);

  // Not logged in - go to login
  if (!wallet) {
    return <Redirect href="/login" />;
  }

  // Wait for welcome store to hydrate before deciding
  if (!hasHydrated) {
    return <SplashScreen />;
  }

  // Check if welcome screens should be shown for this wallet
  if (shouldShowWelcome(wallet.address)) {
    return <Redirect href="/welcome" />;
  }

  // Already seen welcome - go to home
  return <Redirect href="/(tabs)/home" />;
}
