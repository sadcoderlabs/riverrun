import { Stack, useLocalSearchParams } from 'expo-router';

export default function MarketLayout() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <Stack>
      <Stack.Screen name="(tab)/index" options={{ title: market || 'Market' }} />
      <Stack.Screen name="(tab)/positions" options={{ title: 'Positions' }} />
      <Stack.Screen name="(tab)/orders" options={{ title: 'Orders' }} />
      <Stack.Screen name="(tab)/history" options={{ title: 'History' }} />
    </Stack>
  );
}
