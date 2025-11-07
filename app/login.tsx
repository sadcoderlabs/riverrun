import { Button } from '@/components/global/Button';
import { Heading } from '@/components/global/Heading';
import { useThemePreference, useWalletManager } from '@/lib/riverrun/hooks';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { Text, View, YStack } from 'tamagui';

export default function Login() {
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();
  const { connectPrivy, connectReown } = useWalletManager();

  // Handle email login via Privy
  const handleEmailLogin = async () => {
    try {
      const session = await connectPrivy();
      if (session) {
        toast.success('Welcome!', {
          description: 'Login successful',
        });
      }
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
      connectReown();
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
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4" width="100%">
        {/* App Logo */}
        <Heading.H1 fontFamily="$interSemiBold" fontSize="$10" lineHeight={70} paddingVertical="$2">
          RVR
        </Heading.H1>

        {/* Tagline */}
        <Text
          fontFamily="$interRegular"
          fontSize={16}
          color="$color9"
          textAlign="center"
          marginBottom="$4"
        >
          Futures Trading In Motion
        </Text>

        {/* Login Buttons */}
        <YStack gap="$3" width="100%" maxWidth={400} paddingHorizontal="$4">
          <Button.Filled level="lg" onPress={handleEmailLogin}>
            Continue with Email
          </Button.Filled>

          {/* Divider */}
          <YStack alignItems="center" gap="$2" marginVertical="$2">
            <Text color="$color9" fontSize={14}>
              or
            </Text>
          </YStack>

          {/* Connect Wallet Button */}
          <Button.Tinted level="lg" onPress={handleWalletConnect}>
            Continue with Wallet
          </Button.Tinted>
        </YStack>
      </YStack>

      {/* Powered by logo at bottom */}
      <YStack paddingBottom="$4" alignItems="center" width="100%" padding="$2">
        <Image
          source={
            effectiveTheme === 'dark'
              ? require('@/assets/images/PoweredByHL-light.png')
              : require('@/assets/images/PoweredByHL-dark.png')
          }
          style={{ width: 200 }}
          resizeMode="contain"
        />
      </YStack>
    </View>
  );
}
