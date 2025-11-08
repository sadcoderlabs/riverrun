import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { Star } from '@tamagui/lucide-icons';
import { memo } from 'react';
import { Text, XStack, YStack } from 'tamagui';

type Market = {
  marketPair: string;
  coin: string;
  price: number;
  change: number;
  maxLeverage: number;
  volume: number;
  szDecimals: number;
};

interface MarketListItemProps extends Market {
  isFavorite?: boolean;
  onPress: () => void;
  onToggleFavorite?: (marketId: string) => void;
}

/**
 * Market list item component with performance optimizations
 * Uses React.memo to prevent re-renders when props haven't changed
 */
const MarketListItemComponent = ({
  marketPair,
  coin,
  price,
  change,
  maxLeverage,
  volume,
  szDecimals,
  isFavorite = false,
  onPress,
  onToggleFavorite,
}: MarketListItemProps) => {
  const isPriceUp = change >= 0;

  const handleStarPress = (e: any) => {
    e.stopPropagation();
    onToggleFavorite?.(marketPair);
  };

  // Format price using Hyperliquid standard formatPrice
  const formattedPrice = formatPrice(price, szDecimals, true);

  // Format volume in compact form (e.g., $4.77b, $2.52b)
  const formatVolume = (vol: number): string => {
    if (vol >= 1e9) return `$${(vol / 1e9).toFixed(2)}b`;
    if (vol >= 1e6) return `$${(vol / 1e6).toFixed(2)}m`;
    if (vol >= 1e3) return `$${(vol / 1e3).toFixed(2)}k`;
    return `$${vol.toFixed(2)}`;
  };

  return (
    <XStack
      paddingVertical="$2.5"
      paddingHorizontal="$2"
      onPress={onPress}
      pressStyle={{ opacity: 0.7, backgroundColor: '$gray2' }}
      backgroundColor="$background"
      alignItems="center"
      gap="$3"
    >
      {/* Left Column: Star + Market Name + Leverage + Volume */}
      <XStack flex={1} gap="$1.5" alignItems="center">
        {/* Star Icon */}
        <XStack onPress={handleStarPress} pressStyle={{ opacity: 0.7 }} padding="$1.5">
          <Star
            size="$1"
            color={isFavorite ? '#FDB022' : '$gray9'}
            fill={isFavorite ? '#FDB022' : 'transparent'}
          />
        </XStack>

        {/* Market Name + Leverage + Volume */}
        <YStack gap="$0.5" flex={1}>
          {/* Market Name + Leverage Badge */}
          <XStack alignItems="center" gap="$2">
            <Text fontFamily="$interSemiBold" fontSize="$3" color="$color">
              {coin}
            </Text>
            <XStack
              backgroundColor="rgba(255, 100, 50, 0.15)"
              paddingHorizontal="$1.5"
              paddingVertical="$0.5"
              borderRadius="$2"
              borderWidth={1}
              borderColor="rgba(255, 100, 50, 0.4)"
            >
              <Text fontSize="$1" color="rgba(255, 120, 70, 1)" fontFamily="$interMedium">
                {maxLeverage}x
              </Text>
            </XStack>
          </XStack>

          {/* Volume */}
          <Text fontSize="$1" color="$gray10" fontFamily="$interRegular">
            {formatVolume(volume)}
          </Text>
        </YStack>
      </XStack>

      {/* Middle Column: Price */}
      <YStack alignItems="flex-end" minWidth={100}>
        <Text fontFamily="$interSemiBold" fontSize="$4" color="$color">
          ${formattedPrice}
        </Text>
      </YStack>

      {/* Right Column: 24h Change */}
      <YStack alignItems="flex-end" minWidth={80}>
        <XStack
          backgroundColor={isPriceUp ? 'rgba(20, 80, 70, 0.6)' : 'rgba(100, 30, 30, 0.6)'}
          paddingHorizontal="$2"
          paddingVertical="$1.5"
          borderRadius="$2"
        >
          <Text
            fontFamily="$interSemiBold"
            fontSize="$3"
            color={isPriceUp ? 'rgba(100, 220, 180, 1)' : 'rgba(255, 100, 100, 1)'}
          >
            {isPriceUp ? '+' : ''}
            {change.toFixed(2)}%
          </Text>
        </XStack>
      </YStack>
    </XStack>
  );
};

/**
 * Custom comparison function for React.memo
 * Only re-render when these specific props change
 * This is critical for performance with real-time price updates
 */
function arePropsEqual(prev: MarketListItemProps, next: MarketListItemProps): boolean {
  // Always re-render if marketPair changed (shouldn't happen, but safety check)
  if (prev.marketPair !== next.marketPair) return false;

  // Re-render if price changed (most common case with real-time updates)
  if (prev.price !== next.price) return false;

  // Re-render if price change percentage changed
  if (prev.change !== next.change) return false;

  // Re-render if favorite status changed
  if (prev.isFavorite !== next.isFavorite) return false;

  // Re-render if volume changed (for sorting)
  if (prev.volume !== next.volume) return false;

  // Static data - should never change, but check for safety
  if (prev.coin !== next.coin) return false;
  if (prev.maxLeverage !== next.maxLeverage) return false;
  if (prev.szDecimals !== next.szDecimals) return false;

  // Callbacks are stable from useCallback, but check if reference changed
  if (prev.onPress !== next.onPress) return false;
  if (prev.onToggleFavorite !== next.onToggleFavorite) return false;

  // All relevant props are equal - skip re-render
  return true;
}

/**
 * Memoized MarketListItem component
 * Prevents unnecessary re-renders when only other items in the list change
 */
export const MarketListItem = memo(MarketListItemComponent, arePropsEqual);
