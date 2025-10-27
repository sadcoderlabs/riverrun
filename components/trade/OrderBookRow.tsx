import { memo } from 'react';
import { Text, XStack, YStack } from 'tamagui';

interface OrderBookRowProps {
  price: string;
  size: string;
  type: 'bid' | 'ask';
  depthPercentage: number; // 0-100
  onPress?: () => void;
}

/**
 * Individual row component for order book displaying price, size, and depth bar
 */
export const OrderBookRow = memo(function OrderBookRow({
  price,
  size,
  type,
  depthPercentage,
  onPress,
}: OrderBookRowProps) {
  const isBid = type === 'bid';

  // Format numbers for display with consistent formatting
  const priceNum = parseFloat(price);
  const sizeNum = parseFloat(size);

  // Format price with consistent decimal places
  const formattedPrice = priceNum.toLocaleString('en-US', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });

  // Format size with consistent decimal places based on magnitude
  let formattedSize: string;
  if (sizeNum >= 1000) {
    // Large numbers: show with K suffix and 2 decimals
    formattedSize = (sizeNum / 1000).toFixed(2) + 'k';
  } else if (sizeNum >= 1) {
    // Medium numbers: 3 decimal places
    formattedSize = sizeNum.toFixed(3);
  } else {
    // Small numbers: 6 decimal places
    formattedSize = sizeNum.toFixed(6);
  }

  return (
    <XStack
      position="relative"
      height={20}
      alignItems="center"
      paddingHorizontal="$1.5"
      paddingVertical="$0.5"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      {/* Depth Bar Background */}
      <YStack
        position="absolute"
        right={isBid ? 0 : undefined}
        left={isBid ? undefined : 0}
        top={0}
        bottom={0}
        width={`${depthPercentage}%`}
        backgroundColor={isBid ? '$green3' : '$red3'}
        opacity={0.3}
        zIndex={0}
      />

      {/* Content */}
      <XStack flex={1} justifyContent="space-between" alignItems="center" zIndex={1}>
        {/* Price */}
        <Text fontFamily="$skMono" fontSize="$1" color={isBid ? '$green10' : '$red10'} width={85}>
          {formattedPrice}
        </Text>

        {/* Size */}
        <Text
          fontFamily="$skMono"
          fontSize="$1"
          color="$color"
          textAlign="right"
          width={70}
          paddingRight="$1"
        >
          {formattedSize}
        </Text>
      </XStack>
    </XStack>
  );
});
