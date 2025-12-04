import { useScreenTracking, useWallet } from '@/app-internal';
import { Button } from '@/app-internal/components/global/Button';
import { Heading } from '@/app-internal/components/global/Heading';
import { CustomIcons } from '@/app-internal/components/global/icons/CustomIcons';
import { Text } from '@/app-internal/components/global/Text';
import LoginFeedbackModal from '@/app-internal/components/login/LoginFeedbackModal';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { toast } from 'sonner-native';
import { Spinner, View, YStack } from 'tamagui';

export default function Login() {
  useScreenTracking('Login');
  const insets = useSafeAreaInsets();
  const { connect } = useWallet();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  // Handle email login via Privy
  const handleEmailLogin = async () => {
    // Prevent double-clicking
    if (isLoggingIn) {
      return;
    }

    setIsLoggingIn(true);

    // Give React a chance to render the loading state before blocking on connect
    await new Promise(resolve => setTimeout(resolve, 0));

    try {
      await connect('privy');
      toast.success('Welcome!', {
        description: 'Login successful',
      });
    } catch (error: any) {
      // Don't show error for user cancellation
      if (error?.code === 'USER_CANCELLED') {
        console.log('User cancelled login');
        return;
      }

      // Don't show error for concurrent login attempts (silently ignored)
      if (error?.code === 'ALREADY_CONNECTING') {
        console.log('Login already in progress, ignoring duplicate request');
        return;
      }

      console.error('Privy login error:', error);
      toast.error('Login failed', {
        description: 'Please try again',
      });
    } finally {
      setIsLoggingIn(false);
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
          <CustomIcons.PerpgoLogo width={196} height={56} fillColor="white" />
        </YStack>

        <YStack>
          {/* Tagline */}
          <Heading.H5 color="$color12" textAlign="center" marginTop="$0" marginBottom="$3">
            Futures Trading In Motion
          </Heading.H5>
        </YStack>

        {/* Login Buttons */}
        <YStack gap="$3" width="100%" maxWidth={400} paddingHorizontal="$4" mt="$4">
          {/* Connect Wallet Button */}
          <Button.Filled level="lg" onPress={handleWalletConnect}>
            Connect Wallet
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
          <Button.Tinted
            level="lg"
            onPress={handleEmailLogin}
            disabled={isLoggingIn}
            icon={isLoggingIn ? <Spinner size="small" color="$accent1" /> : undefined}
          >
            {isLoggingIn ? 'Logging in...' : 'Continue with Email'}
          </Button.Tinted>
        </YStack>
      </YStack>

      {/* User Feedback Link */}
      <YStack paddingBottom="$4" alignItems="center" width="100%" padding="$4">
        <Text.Footnote
          color="$color10"
          textAlign="center"
          textDecorationLine="underline"
          onPress={() => setIsFeedbackModalOpen(true)}
        >
          Need another way to sign in?
        </Text.Footnote>
      </YStack>

      {/* Login Feedback Modal */}
      <LoginFeedbackModal open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen} />
    </View>
  );
}
