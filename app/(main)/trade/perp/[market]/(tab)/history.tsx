import { useLocalSearchParams } from 'expo-router';
import { Text, YStack } from 'tamagui';

export default function HistoryScreen() {
  const { market } = useLocalSearchParams<{ market: string }>();

  return (
    <YStack flex={1} justifyContent="center" alignItems="center" backgroundColor="$gray3">
      <Text fontFamily="$interSemiBold" fontSize="$5">
        {market} History
      </Text>
      <Text marginTop="$4" color="$gray10">
        Your trading history will appear here
      </Text>
    </YStack>
  );
}
