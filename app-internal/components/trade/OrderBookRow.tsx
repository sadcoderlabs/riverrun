import { formatPrice } from '@/infra/hyperliquid/format/formatPrice';
import { memo } from 'react';
import { Platform } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

// Use system monospace font for guaranteed tabular numbers
const MONOSPACE_FONT = Platform.select({
  ios: 'Menlo',
  android: 'monospace',
  default: 'monospace',
});

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
  /**
   * Size unit: 'asset' or 'usd'
   * When 'asset', size is already formatted with fixed decimals
   * When 'usd', size needs formatting with K suffix
   */
  sizeUnit: 'asset' | 'usd';
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
  sizeUnit,
  onPress,
}: OrderBookRowProps) {
  const isBid = type === 'bid';

  // Format price according to Hyperliquid rules
  // This removes trailing zeros: "4180.60" → "4180.6"
  // Why? Due to 5-sig-fig rule, "4180.6" is already 5 sig figs,
  // so "4180.60" would be redundant
  const formattedPrice = formatPrice(price, szDecimals, true);

  // Format size based on unit
  // Both asset and USD modes: size is already formatted with formatSizeFixedDecimals
  // - Asset mode: fixed decimals based on szDecimals (e.g., "12.01400" for BTC)
  // - USD mode: integer with thousand separators (e.g., "1,234")
  const formattedSize = size;

  return (
    <XStack
      position="relative"
      height={20}
      alignItems="center"
      paddingLeft="$3"
      paddingRight="$1.5"
      paddingVertical="$0.5"
      onPress={onPress}
      pressStyle={{ opacity: 0.7 }}
    >
      {/* Depth Bar Background - Unified direction from right to left */}
      <YStack
        position="absolute"
        right={0}
        top={0}
        bottom={0}
        width={`${depthPercentage}%`}
        backgroundColor={isBid ? '$green3' : '$red3'}
        opacity={0.6}
        zIndex={0}
      />

      {/* Content */}
      <XStack flex={1} justifyContent="space-between" alignItems="center" zIndex={1}>
        {/* Price */}
        <Text
          fontSize="$1"
          color={isBid ? '$green10' : '$red10'}
          flexShrink={0}
          style={{
            fontFamily: MONOSPACE_FONT,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formattedPrice}
        </Text>

        {/* Size */}
        <Text
          fontSize="$1"
          color="$color"
          textAlign="right"
          flexShrink={0}
          style={{
            fontFamily: MONOSPACE_FONT,
            fontVariant: ['tabular-nums'],
          }}
        >
          {formattedSize}
        </Text>
      </XStack>
    </XStack>
  );
});
