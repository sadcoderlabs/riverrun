import { Text, XStack, YStack } from 'tamagui';

type Market = {
  id: string;
  price: number;
  change: number;
  maxLeverage: number;
};

interface MarketListItemProps extends Market {
  onPress: () => void;
}

export function MarketListItem({ id, price, change, maxLeverage, onPress }: MarketListItemProps) {
  const isPriceUp = change >= 0;

  return (
    <YStack
      paddingVertical="$3"
      paddingHorizontal="$4"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      backgroundColor="$background"
      borderRadius="$2"
    >
      {/* First row: Market ID and Price */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
        <YStack>
          <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
            {id}
          </Text>
        </YStack>
        <Text fontFamily="$interRegular" fontSize="$4" color="$color" fontWeight="500">
          ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
      </XStack>

      {/* Second row: Max Leverage and Price Change */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack
          backgroundColor="$gray3"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$1"
          alignItems="center"
        >
          <Text fontSize="$1" color="$gray11" fontFamily="$interMedium">
            {maxLeverage}x Max
          </Text>
        </XStack>

        <Text fontFamily="$interMedium" fontSize="$3" color={isPriceUp ? '$green9' : '$red9'}>
          {isPriceUp ? '+' : ''}
          {change}%
        </Text>
      </XStack>
    </YStack>
  );
}
