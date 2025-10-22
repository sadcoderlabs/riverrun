import { Input } from '@/components/global/input';
import { Text, XStack, YStack } from 'tamagui';

interface MarketOrderFormProps {
  size: string;
  onSizeChange: (value: string) => void;
}

export function MarketOrderForm({ size, onSizeChange }: MarketOrderFormProps) {
  return (
    <YStack gap="$1.5">
      <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
        Size
      </Text>
      <XStack
        backgroundColor="$gray3"
        borderRadius="$3"
        paddingVertical="$1.5"
        paddingHorizontal="$2.5"
        borderColor="$gray8"
        borderWidth={1}
        justifyContent="space-between"
        alignItems="center"
        height="$3"
      >
        <Input
          flex={1}
          placeholder="0.0"
          value={size}
          onChangeText={onSizeChange}
          keyboardType="numeric"
          returnKeyType="done"
          fontSize="$3"
          fontFamily="$interRegular"
          borderWidth={0}
          paddingHorizontal={0}
          paddingVertical={0}
        />
        <Text fontFamily="$interSemiBold" fontSize="$2" color="$gray10" marginLeft="$2">
          BTC
        </Text>
      </XStack>
    </YStack>
  );
}
