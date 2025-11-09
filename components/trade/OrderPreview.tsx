import { formatValue } from '@/lib/hyperliquid/format/formatValue';
import { Text, XStack, YStack } from 'tamagui';

interface OrderPreviewProps {
  orderValue: number;
  marginRequired: number;
}

/**
 * Component to display order preview with calculation results
 *
 * Shows:
 * - Order value (size × execution price)
 * - Margin required (order value / leverage)
 *
 * Only displayed when user has entered valid inputs
 */
export function OrderPreview({ orderValue, marginRequired }: OrderPreviewProps) {
  return (
    <YStack gap="$2.5" marginTop="$2">
      {/* Order Value */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Order Value
        </Text>
        <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
          ${formatValue(orderValue, 2)}
        </Text>
      </XStack>

      {/* Margin Required */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Margin Required
        </Text>
        <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
          ${formatValue(marginRequired, 2)}
        </Text>
      </XStack>
    </YStack>
  );
}
