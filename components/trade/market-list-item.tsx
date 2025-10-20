import { Star } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';

type Market = {
  id: string;
  name: string;
  price: number;
  change: number;
  maxLeverage: number;
};

interface MarketListItemProps extends Market {
  isFavorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: (marketId: string) => void;
}

export function MarketListItem({
  id,
  name,
  price,
  change,
  maxLeverage,
  isFavorite = false,
  onPress,
  onToggleFavorite,
}: MarketListItemProps) {
  const isPriceUp = change >= 0;

  const handleStarPress = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.(id);
  };

  // Format price with at least 5 significant digits total
  // Rule: Show all integer digits + decimal digits to reach minimum 5 significant figures
  const formatPrice = (price: number): string => {
    // Get the integer part to count its digits
    const integerPart = Math.floor(Math.abs(price));
    const integerDigits = integerPart === 0 ? 0 : integerPart.toString().length;

    // Calculate how many decimal places we need to reach 5 significant figures
    const minSignificantDigits = 5;
    const decimalPlaces = Math.max(0, minSignificantDigits - integerDigits);

    return price.toLocaleString(undefined, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces,
    });
  };

  return (
    <YStack
      paddingVertical="$3"
      paddingHorizontal="$4"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
      backgroundColor="$background"
      borderRadius="$2"
    >
      {/* First row: Star, Market Name and Price */}
      <XStack justifyContent="space-between" alignItems="center" marginBottom="$2">
        <XStack alignItems="center" gap="$2">
          <XStack onPress={handleStarPress} pressStyle={{ opacity: 0.7 }} padding="$1">
            <Star
              size="$1"
              color={isFavorite ? '#FDB022' : '$gray9'}
              fill={isFavorite ? '#FDB022' : 'transparent'}
            />
          </XStack>
          <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
            {name}
          </Text>
        </XStack>
        <Text fontFamily="$interRegular" fontSize="$4" color="$color" fontWeight="500">
          ${formatPrice(price)}
        </Text>
      </XStack>

      {/* Second row: Max Leverage and Price Change */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack
          backgroundColor="rgba(20, 80, 70, 0.8)"
          paddingHorizontal="$2"
          paddingVertical="$1"
          borderRadius="$2"
          alignItems="center"
        >
          <Text fontSize="$1" color="rgba(100, 220, 180, 1)" fontFamily="$interMedium">
            {maxLeverage}x
          </Text>
        </XStack>

        <Text fontFamily="$interMedium" fontSize="$3" color={isPriceUp ? '$green9' : '$red9'}>
          {isPriceUp ? '+' : ''}
          {change.toFixed(2)}%
        </Text>
      </XStack>
    </YStack>
  );
}
