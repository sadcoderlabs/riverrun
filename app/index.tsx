import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isConnected } = useAppKitAccount();

  if (isConnected) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/login" />;
}
