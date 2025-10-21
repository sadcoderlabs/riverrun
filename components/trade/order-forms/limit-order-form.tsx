import { Text, XStack, YStack } from 'tamagui';

interface LimitOrderFormProps {
  limitPrice: string;
  onLimitPriceChange: (value: string) => void;
  sizeUsd: string;
  onSizeChange: (value: string) => void;
  marketPrice: number;
}

export function LimitOrderForm({
  limitPrice,
  onLimitPriceChange,
  sizeUsd,
  onSizeChange,
  marketPrice,
}: LimitOrderFormProps) {
  return (
    <>
      {/* Limit Price */}
      <YStack gap="$1.5">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
            Limit Price
          </Text>
          <Text
            fontFamily="$interRegular"
            fontSize="$2"
            color="$accent9"
            onPress={() => onLimitPriceChange(marketPrice.toFixed(1))}
            pressStyle={{ opacity: 0.7 }}
          >
            Mid
          </Text>
        </XStack>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$2"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
        >
          <Text fontFamily="$interRegular" fontSize="$3" color="$color">
            {limitPrice}
          </Text>
        </XStack>
      </YStack>

      {/* Size (USD) */}
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
    </>
  );
}
