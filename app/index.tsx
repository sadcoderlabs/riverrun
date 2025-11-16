import { useWalletContext } from '@/core/app-internal';
import { Redirect } from 'expo-router';

export default function Index() {
  const { wallet } = useWalletContext();

  if (wallet) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}
