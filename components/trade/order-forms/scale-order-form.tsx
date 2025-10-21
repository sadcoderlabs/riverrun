import { Text, XStack, YStack } from 'tamagui';

interface ScaleOrderFormProps {
  lowerPrice: string;
  onLowerPriceChange: (value: string) => void;
  upperPrice: string;
  onUpperPriceChange: (value: string) => void;
  orderCount: string;
  onOrderCountChange: (value: string) => void;
  sizeSkew: string;
  onSizeSkewChange: (value: string) => void;
  sizeUsd: string;
  onSizeChange: (value: string) => void;
  marketPrice: number;
}

export function ScaleOrderForm({
  lowerPrice,
  onLowerPriceChange,
  upperPrice,
  onUpperPriceChange,
  orderCount,
  onOrderCountChange,
  sizeSkew,
  onSizeSkewChange,
  sizeUsd,
  onSizeChange,
  marketPrice,
}: ScaleOrderFormProps) {
  return (
    <>
      {/* Lower Price */}
      <YStack gap="$1.5">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
            Lower (USDT)
          </Text>
          <Text
            fontFamily="$interRegular"
            fontSize="$2"
            color="$accent9"
            onPress={() => onLowerPriceChange(marketPrice.toFixed(1))}
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
            {lowerPrice}
          </Text>
        </XStack>
      </YStack>

      {/* Upper Price */}
      <YStack gap="$1.5">
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
            Upper (USDT)
          </Text>
          <Text
            fontFamily="$interRegular"
            fontSize="$2"
            color="$accent9"
            onPress={() => onUpperPriceChange(marketPrice.toFixed(1))}
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
            {upperPrice}
          </Text>
        </XStack>
      </YStack>

      {/* Order Count */}
      <YStack gap="$1.5">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Order Count (2-100)
        </Text>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$2"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
        >
          <Text fontFamily="$interRegular" fontSize="$3" color="$color">
            {orderCount}
          </Text>
        </XStack>
      </YStack>

      {/* Size Skew */}
      <YStack gap="$1.5">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Size Skew (0.1-2.0)
        </Text>
        <XStack
          backgroundColor="$gray3"
          borderRadius="$3"
          paddingVertical="$2"
          paddingHorizontal="$2.5"
          borderColor="$gray8"
          borderWidth={1}
        >
          <Text fontFamily="$interRegular" fontSize="$3" color="$color">
            {sizeSkew}
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
