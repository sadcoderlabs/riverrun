import { Text, YStack } from 'tamagui';

export default function SpotTradeIndex() {
  return (
    <YStack flex={1} backgroundColor="$gray3" justifyContent="center" alignItems="center" padding="$4">
      <Text fontFamily="$interSemiBold" fontSize="$6" color="$color" marginBottom="$2">
        Spot Trading
      </Text>
      <Text fontFamily="$interRegular" fontSize="$4" color="$gray10" textAlign="center">
        Spot trading will be available soon
      </Text>
    </YStack>
  );
}
