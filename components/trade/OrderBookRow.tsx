import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { memo } from 'react';
import { Text, XStack, YStack } from 'tamagui';

interface OrderBookRowProps {
  price: string;
  size: string;
  type: 'bid' | 'ask';
  depthPercentage: number; // 0-100
  /**
   * Size decimals for the asset (from Hyperliquid meta)
   * Used to determine maximum decimal places for price display
   */
  szDecimals: number;
  onPress?: () => void;
}

/**
 * Individual row component for order book displaying price, size, and depth bar
 *
 * Price formatting follows Hyperliquid rules:
 * - Max (MAX_DECIMALS - szDecimals) decimal places
 * - Trailing zeros removed for clean display
 * - Only meaningful digits are shown
 */
export const OrderBookRow = memo(function OrderBookRow({
  price,
  size,
  type,
  depthPercentage,
  szDecimals,
  onPress,
}: OrderBookRowProps) {
  const isBid = type === 'bid';

  // Format price according to Hyperliquid rules
  // This removes trailing zeros: "4180.60" → "4180.6"
  // Why? Due to 5-sig-fig rule, "4180.6" is already 5 sig figs,
  // so "4180.60" would be redundant
  const formattedPrice = formatPrice(price, szDecimals);

  // Format size for display
  const sizeNum = parseFloat(size);

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
