import { useWallet } from '@/app-internal';
import { Redirect } from 'expo-router';

/**
 * Root Index - Entry point after app load
 *
 * This component handles the initial routing:
 * - Not logged in → Login screen
 * - Logged in → Home tab
 *
 * Note: Welcome screen is now triggered from the Trade tab
 * when user has margin > 0. See useWelcomeTrigger hook.
 */
export default function Index() {
  const { wallet } = useWallet();

  // Not logged in - go to login
  if (!wallet) {
    return <Redirect href="/login" />;
  }

  // Logged in - go directly to home
  // Welcome screen will be triggered from Trade tab when margin > 0
  return <Redirect href="/(tabs)/home" />;
}
