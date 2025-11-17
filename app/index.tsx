import { useWallet } from '@/app-internal';
import { Redirect } from 'expo-router';

export default function Index() {
  const { wallet } = useWallet();

  if (wallet) {
    return <Redirect href="/(tabs)/home" />;
  }

  return <Redirect href="/login" />;
}
