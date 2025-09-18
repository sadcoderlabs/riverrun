import { useAppKit } from '@reown/appkit-wagmi-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Text, View } from 'tamagui';

export default function Login() {
  const { open } = useAppKit();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
      }}
    >
      <Text>Login screen</Text>
      <Button size="$3" onPress={() => open()}>
        Connect Wallet
      </Button>
    </View>
  );
}
