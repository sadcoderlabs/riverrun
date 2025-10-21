import { Text, XStack, YStack } from 'tamagui';

interface MarketOrderFormProps {
  sizeUsd: string;
  onSizeChange: (value: string) => void;
}

export function MarketOrderForm({ sizeUsd, onSizeChange }: MarketOrderFormProps) {
  return (
    <YStack gap="$1.5">
      <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
        Size (USD)
      </Text>
      <XStack
        backgroundColor="$gray3"
        borderRadius="$3"
        paddingVertical="$2"
        paddingHorizontal="$2.5"
        borderColor="$gray8"
        borderWidth={1}
        justifyContent="space-between"
        alignItems="center"
      >
        <Text fontFamily="$interRegular" fontSize="$3" color="$color">
          {sizeUsd}
        </Text>
        <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
          USD
        </Text>
      </XStack>
    </YStack>
  );
}
