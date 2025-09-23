import { Text, YStack } from 'tamagui';

interface TradeUIProps {
  marketId?: string;
}

export function TradeUI({ marketId }: TradeUIProps) {
  return (
    <YStack flex={1} justifyContent="center" alignItems="center" padding="$4">
      <Text fontFamily="$interMedium" fontSize="$5" color="$color" textAlign="center">
        This is trade UI{marketId ? ` for ${marketId}` : ''}
      </Text>
    </YStack>
  );
}
