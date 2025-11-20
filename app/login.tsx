import { useWallet } from '@/app-internal';
import { Button } from '@/app-internal/components/global/Button';
import { CustomIcons } from '@/app-internal/components/global/icons/CustomIcons';
import { useThemePreference } from '@/app-internal/components/shared/theme/useThemePreference';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { Text, View, YStack } from 'tamagui';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const { connect } = useWallet();

  // Handle email login via Privy
  const handleEmailLogin = async () => {
    try {
      await connect('privy');
      toast.success('Welcome!', {
        description: 'Login successful',
      });
    } catch (error: any) {
      console.error('Privy login error:', error);
      toast.error('Login failed', {
        description: 'Please try again',
      });
    }
  };

  // Handle external wallet connection
  const handleWalletConnect = () => {
    try {
      connect('reown');
      // AppKit handles the connection flow
      // Once connected, the app will automatically navigate to main screen
      // via the authentication logic in _layout.tsx
    } catch (error) {
      console.error('Wallet connection error:', error);
    }
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingHorizontal: 20,
      }}
    >
      {/* Main content - centered vertically */}
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$2" width="100%">
        {/* App Logo */}
        <YStack marginTop="$2" alignItems="center" justifyContent="flex-start" width="100%">
          <CustomIcons.PerpgoLogo width={280} height={80} fillColor="white" />
        </YStack>

        {/* Login Buttons */}
        <YStack gap="$3" width="100%" maxWidth={400} paddingHorizontal="$4" marginTop="$4">
          {/* Tagline */}
          <Text
            fontFamily="$interMedium"
            fontSize={18}
            color="$color12"
            textAlign="center"
            marginTop="$0"
            marginBottom="$3"
          >
            Futures Trading In Motion
          </Text>
          {/* Connect Wallet Button */}
          <Button.Filled level="lg" onPress={handleWalletConnect}>
            Connect Wallet via Reown
          </Button.Filled>

          {/* Divider with horizontal lines */}
          <YStack alignItems="center" marginVertical="$4">
            <View flexDirection="row" alignItems="center" width="100%">
              <View flex={1} height={1} backgroundColor="$color6" />
              <Text color="$color9" fontSize={14} marginHorizontal="$3">
                or
              </Text>
              <View flex={1} height={1} backgroundColor="$color6" />
            </View>
          </YStack>
          <Button.Tinted level="lg" onPress={handleEmailLogin}>
            Continue with Email
          </Button.Tinted>
        </YStack>
      </YStack>

      {/* Powered by logo at bottom */}
      <YStack paddingBottom="$4" alignItems="center" width="100%" padding="$2">
        <Image
          source={
            effectiveTheme === 'dark'
              ? require('@/app-internal/assets/images/PoweredByHL-light.png')
              : require('@/app-internal/assets/images/PoweredByHL-dark.png')
          }
          style={{ width: 160 }}
          resizeMode="contain"
        />
      </YStack>
    </View>
  );
}
