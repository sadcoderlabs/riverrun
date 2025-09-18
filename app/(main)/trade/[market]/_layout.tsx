import { Stack, useLocalSearchParams } from 'expo-router';

export default function MarketLayout() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <Stack>
      <Stack.Screen
        name="(tab)"
        options={{
          title: market || 'Market',
          headerShown: true,
        }}
      />
    </Stack>
  );
}
