import { useWallet } from '@/hooks/useWallet';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated } = useWallet();

  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/login" />;
}
