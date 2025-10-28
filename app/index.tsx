import { useAppKitAccount } from '@reown/appkit-ethers-react-native';
import { usePrivy } from '@privy-io/expo';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isConnected } = useAppKitAccount();
  const { user } = usePrivy();

  // User is authenticated if they're logged in with Privy OR connected wallet
  const isAuthenticated = !!user || isConnected;

  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/login" />;
}
