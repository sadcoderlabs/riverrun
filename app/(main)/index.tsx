import { useRouter } from 'expo-router';
import { Text } from 'tamagui';

export default function Index() {
  const router = useRouter();

  const navigateToTrade = () => {
    router.navigate('/(main)/trade/BTC-USD/(tab)/trade');
  };

  const navigateToSettings = () => {
    router.navigate('/settings');
  };

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Link href="/(main)/settings">Settings</Link>
      <Link href="/(main)/account/(tab)/positions">Positions</Link>
      <Text>Home screen</Text>
    </View>
  );
}
