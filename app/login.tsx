import { Button } from '@/components/global/button';
import { Heading } from '@/components/global/heading';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useAppKit, useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { useLoginWithEmail, usePrivy } from '@privy-io/expo';
import { useState } from 'react';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Input, Text, View, YStack } from 'tamagui';

export default function Login() {
  const { open } = useAppKit();
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();

  const { address, isConnected, chainId } = useAppKitAccount();
  const { user } = usePrivy();
  const { sendCode, loginWithCode, state } = useLoginWithEmail();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');

  const handleSendCode = async () => {
    try {
      await sendCode({ email });
    } catch (error) {
      console.error('Error sending code:', error);
    }
  };

  const handleLoginWithCode = async () => {
    try {
      await loginWithCode({ code, email });
    } catch (error) {
      console.error('Error logging in:', error);
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

        {/* Email Login Section */}
        <YStack gap="$3" width="100%" maxWidth={400} paddingHorizontal="$4">
          <Input
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            size="$4"
            borderWidth={1}
            borderColor="$borderColor"
          />

          {state.status === 'awaiting-code-input' && (
            <Input
              placeholder="Enter verification code"
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              size="$4"
              borderWidth={1}
              borderColor="$borderColor"
            />
          )}

          {state.status === 'initial' && (
            <Button.Filled level="lg" onPress={handleSendCode} disabled={!email}>
              Continue with Email
            </Button.Filled>
          )}

          {state.status === 'sending-code' && (
            <Button.Filled level="lg" disabled>
              Sending code...
            </Button.Filled>
          )}

          {state.status === 'awaiting-code-input' && (
            <Button.Filled level="lg" onPress={handleLoginWithCode} disabled={!code}>
              Verify Code
            </Button.Filled>
          )}

          {state.status === 'submitting-code' && (
            <Button.Filled level="lg" disabled>
              Verifying...
            </Button.Filled>
          )}

          {/* Divider */}
          <YStack alignItems="center" gap="$2" marginVertical="$2">
            <Text color="$color9" fontSize={14}>
              or
            </Text>
          </YStack>

          {/* Connect Wallet Button */}
          <Button.Filled level="lg" onPress={() => open()}>
            Connect Wallet
          </Button.Filled>
        </YStack>

        {/* Debug info */}
        {__DEV__ && (
          <YStack gap="$1">
            <Text fontSize={12} color="$color9">
              address: {address || 'none'}
            </Text>
            <Text fontSize={12} color="$color9">
              isConnected: {`${isConnected}`}
            </Text>
            <Text fontSize={12} color="$color9">
              chainId: {chainId || 'none'}
            </Text>
            <Text fontSize={12} color="$color9">
              privy user: {user?.id || 'none'}
            </Text>
          </YStack>
        )}
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
