import { useEffect, useState } from 'react';
import { Button, Popover, Text, XStack, YStack } from 'tamagui';

import { useUserFees } from '@/app-internal';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';
import { Info } from '@tamagui/lucide-icons';

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
 * Only displayed when user has entered valid inputs
 */
export function OrderPreview({ orderValue, marginRequired }: OrderPreviewProps) {
  // Load user fee rates internally
  const { feeRates, loadUserFees } = useUserFees();
  const [tooltipOpen, setTooltipOpen] = useState(false);

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
        <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
          ${formatValue(orderValue, 2)}
        </Text>
      </XStack>

      {/* Margin Required */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Margin Req.
        </Text>
        <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
          ${formatValue(marginRequired, 2)}
        </Text>
      </XStack>

      {/* Fees */}
      {feeRates && (
        <XStack justifyContent="space-between" alignItems="center">
          <XStack alignItems="center" gap="$1">
            <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
              Fees
            </Text>
            <Popover
              size="$3"
              allowFlip
              placement="top-start"
              open={tooltipOpen}
              onOpenChange={setTooltipOpen}
            >
              <Popover.Trigger asChild>
                <Button
                  size="$1"
                  chromeless
                  circular
                  padding="$1"
                  onPress={() => setTooltipOpen(!tooltipOpen)}
                  pressStyle={{ opacity: 0.7 }}
                >
                  <Info size={14} color="$color10" />
                </Button>
              </Popover.Trigger>

              <Popover.Content
                borderWidth={1}
                borderColor="$borderColor"
                enterStyle={{ y: -10, opacity: 0 }}
                exitStyle={{ y: -10, opacity: 0 }}
                elevate
                animation={[
                  'quick',
                  {
                    opacity: {
                      overshootClamping: true,
                    },
                  },
                ]}
              >
                <Popover.Arrow borderWidth={1} borderColor="$borderColor" />
                <YStack padding="$2" gap="$2" maxWidth={200}>
                  <Text fontSize="$2" lineHeight="$3">
                    Total fees including Hyperliquid exchange fees and PERP GO charges. Shown as
                    Taker% / Maker%.
                  </Text>
                </YStack>
              </Popover.Content>
            </Popover>
          </XStack>
          <YStack alignItems="flex-end">
            <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
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
