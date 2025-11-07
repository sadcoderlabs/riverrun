import { useActiveWallet } from '@/lib/riverrun/wallet';
import { Redirect } from 'expo-router';

export default function Index() {
  const { wallet } = useActiveWallet();

  if (wallet) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/login" />;
}
