import { Button } from '@/components/global/button';
import { Heading } from '@/components/global/heading';
import { useThemePreference } from '@/hooks/useThemePreference';
import { useAppKit, useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, View, YStack } from 'tamagui';

export default function Login() {
  const { open } = useAppKit();
  const insets = useSafeAreaInsets();
  const { effectiveTheme } = useThemePreference();

  const { address, isConnected, chainId } = useAppKitAccount();

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
      <YStack flex={1} justifyContent="center" alignItems="center" gap="$4">
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
        <Text>address:{address}</Text>
        <Text>isConnected:{`${isConnected}`}</Text>
        <Text>chainId:{chainId}</Text>

        {/* Connect Wallet Button */}
        <Button.Filled level="lg" onPress={() => open()}>
          Connect Wallet
        </Button.Filled>
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
