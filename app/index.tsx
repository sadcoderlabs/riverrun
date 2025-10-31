import { useActiveWallet } from '@/lib/riverrun/hooks';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated } = useActiveWallet();

  if (isAuthenticated) {
    return <Redirect href="/(main)/home" />;
  }

  return <Redirect href="/login" />;
}
