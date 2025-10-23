import { CandlestickChart, Menu } from '@tamagui/lucide-icons';
import { Text, XStack, YStack } from 'tamagui';

interface AssetInfoProps {
  marketDisplay: string;
  price: number;
  priceChange: number;
  annualizedFunding: number;
  isChart: boolean;
  onToggleChart: () => void;
  onOpenMarketSelector: () => void;
}

export function AssetInfo({
  marketDisplay,
  price,
  priceChange,
  annualizedFunding,
  isChart,
  onToggleChart,
  onOpenMarketSelector,
}: AssetInfoProps) {
  // Helper function to format price with commas
  const formatPrice = (price: number) => {
    return price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // Determine if price change is positive or negative
  const isPriceUp = priceChange >= 0;

  return (
    <YStack padding="$3" gap="$2">
      {/* First row: Menu icon, Market ID, and Chart icon */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack
          alignItems="center"
          gap="$2"
          onPress={onOpenMarketSelector}
          pressStyle={{ opacity: 0.7 }}
          padding="$1"
        >
          <Menu size="$1.5" color="$color" />
          <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
            {marketDisplay}
          </Text>
        </XStack>
        <XStack onPress={onToggleChart} pressStyle={{ opacity: 0.7 }} padding="$1">
          <CandlestickChart size="$1.5" color={isChart ? '$gray9' : '$color'} />
        </XStack>
      </XStack>

      {/* Second row: Price info and Funding Rate */}
      <XStack justifyContent="space-between" alignItems="flex-start">
        <XStack gap="$2" alignItems="baseline">
          <Text fontFamily="$interSemiBold" fontSize="$5" color="$color">
            ${formatPrice(price)}
          </Text>
          <Text fontFamily="$interMedium" fontSize="$3" color={isPriceUp ? '$green9' : '$red9'}>
            {isPriceUp ? '+' : ''}
            {priceChange}%
          </Text>
        </XStack>
        <YStack alignItems="flex-end">
          <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
            Ann. Funding
          </Text>
          <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
            {annualizedFunding.toFixed(2)}% APR
          </Text>
        </YStack>
      </XStack>
    </YStack>
  );
}
