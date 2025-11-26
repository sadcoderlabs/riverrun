import { useEffect } from 'react';
import { Text, XStack, YStack } from 'tamagui';

import { useUserFees } from '@/app-internal';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';

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
 * - Fee rates (taker/maker with discounts)
 *
 * Only displayed when user has entered valid inputs
 */
export function OrderPreview({ orderValue, marginRequired }: OrderPreviewProps) {
  // Load user fee rates internally
  const { feeRates, loadUserFees } = useUserFees();

  useEffect(() => {
    loadUserFees();
  }, [loadUserFees]);

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

      {/* Fees */}
      {feeRates && (
        <XStack justifyContent="space-between" alignItems="center">
          <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
            Fees
          </Text>
          <YStack alignItems="flex-end">
            <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
              {feeRates.takerFeePercent.toFixed(4)}% / {feeRates.makerFeePercent.toFixed(4)}%
            </Text>
            {(feeRates.hasReferralDiscount || feeRates.hasStakingDiscount) && (
              <Text
                fontFamily="$interRegular"
                fontSize="$1"
                color="$gray8"
                textDecorationLine="line-through"
              >
                {feeRates.baseTakerPercent.toFixed(4)}% / {feeRates.baseMakerPercent.toFixed(4)}%
              </Text>
            )}
          </YStack>
        </XStack>
      )}
    </YStack>
  );
}
