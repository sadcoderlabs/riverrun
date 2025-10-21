import { useLocalSearchParams } from 'expo-router';
import { Text, YStack } from 'tamagui';

export default function SpotTradeIndex() {
  const { market } = useLocalSearchParams<{ market: string }>();

  const marketData = {
    id: market || 'BTC-USD',
  };

  return (
    <YStack flex={1} backgroundColor="$gray3">
      {/* Placeholder Content */}
      <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text fontFamily="$interSemiBold" fontSize="$6" color="$color" marginBottom="$2">
          Spot Trading
        </Text>
        <Text fontFamily="$interRegular" fontSize="$4" color="$gray10" textAlign="center">
          Spot trading will be available soon
        </Text>
      </YStack>
    </YStack>
  );
}
