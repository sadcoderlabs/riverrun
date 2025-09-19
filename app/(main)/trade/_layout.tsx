import { Stack } from 'expo-router';

export default function TradeLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="[market]"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
