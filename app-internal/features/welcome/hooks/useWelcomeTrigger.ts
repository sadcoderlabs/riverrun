import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { useAccountMetrics } from '../../../components/home/hooks/useAccountMetrics';
import { useWallet } from '../../wallet/hooks/useWallet';
import { useWelcomeStore } from '../stores/welcomeStore';

/**
 * useWelcomeTrigger - Hook to trigger welcome screen from Trade tab
 *
 * This hook is designed to be used in the Trade tab layout. It monitors:
 * 1. Whether the Trade tab is focused
 * 2. Whether the user has margin > 0 (totalAccountValue > 0)
 * 3. Whether the user has already seen the welcome screen for this wallet
 *
 * When all conditions are met:
 * - Trade tab is focused
 * - Margin > 0
 * - Haven't seen welcome for this wallet
 * - Store is hydrated (loaded from AsyncStorage)
 *
 * The hook will automatically navigate to the welcome screen.
 *
 * @example
 * ```tsx
 * // In app/(tabs)/trade/_layout.tsx
 * export default function TradeLayout() {
 *   useWelcomeTrigger(); // Automatically handles welcome screen trigger
 *
 *   return <Slot />;
 * }
 * ```
 */
export function useWelcomeTrigger(): void {
  const router = useRouter();
  const { address } = useWallet();
  const { totalAccountValue, isLoading } = useAccountMetrics();

  // Subscribe to actual state values (not the function) so component re-renders on changes
  const hasHydrated = useWelcomeStore(state => state._hasHydrated);
  const seenOnDevice = useWelcomeStore(state => state.seenOnDevice);
  const seenWalletAddresses = useWelcomeStore(state => state.seenWalletAddresses);

  // Derived states - simple conditions
  const hasMargin = totalAccountValue !== undefined && totalAccountValue > 0;

  // Compute shouldShowWelcome inline (same logic as store function)
  const shouldShowWelcome = address
    ? !seenOnDevice || !seenWalletAddresses.includes(address)
    : false;

  const shouldTrigger = hasHydrated && !isLoading && hasMargin && shouldShowWelcome;

  // Check on focus - this is the main trigger
  useFocusEffect(
    useCallback(() => {
      if (shouldTrigger) {
        router.replace('/welcome');
      }
    }, [shouldTrigger, router]),
  );
}
