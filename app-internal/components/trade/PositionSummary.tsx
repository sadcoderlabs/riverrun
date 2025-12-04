import { formatSize } from '@/infra/hyperliquid/format/formatSize';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';
import { Text, XStack, YStack } from 'tamagui';

interface PositionSummaryProps {
  availableToTrade: number;
  currentPositionSize: number;
  coin: string;
  szDecimals: number;
  isLoadingAssetData?: boolean;
}

/**
 * Component to display account and position summary
 *
 * Shows:
 * - Available to trade
 * - Current position
 */
export function PositionSummary({
  availableToTrade,
  currentPositionSize,
  coin,
  szDecimals,
  isLoadingAssetData,
}: PositionSummaryProps) {
  return (
    <YStack gap="$2.5">
      {/* Available to Trade */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Available to trade
        </Text>
        <Text fontFamily="$interSemiBold" fontSize="$2" color="$color">
          {isLoadingAssetData ? (
            <Text color="$gray10">Loading...</Text>
          ) : (
            `$${formatValue(availableToTrade, 2)}`
          )}
        </Text>
      </XStack>

      {/* Current Position */}
      <XStack justifyContent="space-between" alignItems="center">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Current Position
        </Text>
        <Text
          fontFamily="$interSemiBold"
          fontSize="$2"
          color={
            currentPositionSize !== 0 ? (currentPositionSize > 0 ? '$green10' : '$red10') : '$color'
          }
        >
          {currentPositionSize !== 0
            ? `${formatSize(Math.abs(currentPositionSize), szDecimals, false)} ${coin}`
            : `0 ${coin}`}
        </Text>
      </XStack>
    </YStack>
  );
}
