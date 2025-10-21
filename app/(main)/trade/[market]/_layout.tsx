import { Stack, useLocalSearchParams } from 'expo-router';

export default function MarketLayout() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <Stack>
      <Stack.Screen
        name="(tab)/index"
        options={{
          title: market || 'Market',
          headerShown: false,
          animation: 'none', // Disable navigation animation for instant market switching
        }}
      />
      <Stack.Screen name="(tab)/positionsTab" options={{ title: 'Positions' }} />
      <Stack.Screen name="(tab)/ordersTab" options={{ title: 'Orders' }} />
      <Stack.Screen name="(tab)/history" options={{ title: 'History' }} />
    </Stack>
  );
}
