import { Stack, useLocalSearchParams } from 'expo-router';

export default function SpotMarketLayout() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <Stack>
      <Stack.Screen
        name="(tab)/index"
        options={{
          title: market || 'Market',
          headerShown: false,
          animation: 'none',
        }}
      />
    </Stack>
  );
}
