import { Stack } from 'expo-router';

/**
 * Home Stack Layout
 *
 * Provides Stack navigation for home-related screens:
 * - index: Main home screen
 * - deposit/*: Deposit routes
 * - withdraw/*: Withdraw routes
 * - settings/*: Settings and related screens
 */
export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="deposit/deposit-hl-bridge" />
      <Stack.Screen name="withdraw/withdraw-hl-bridge" />
      <Stack.Screen name="settings/index" />
      <Stack.Screen name="settings/approval-status/index" />
      <Stack.Screen name="settings/builder-fee-status/index" />
      <Stack.Screen name="settings/agent-status/index" />
    </Stack>
  );
}
