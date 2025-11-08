import { useActiveAssetCtx, useMarketsStore } from '@/lib/hyperliquid/market';
import { useMemo } from 'react';
import { Text, XStack, YStack } from 'tamagui';

/**
 * FundingRate component - displays the current funding rate for the selected market
 *
 * Positioned above the OrderBook to provide key market information
 */
export function FundingRate() {
  const { selectedMarket } = useMarketsStore();
  const coin = selectedMarket?.coin || 'BTC';

  // Subscribe to real-time asset context data
  const { data: assetCtx } = useActiveAssetCtx({ coin });

  // Calculate funding rate from real-time WebSocket data
  const fundingRate = useMemo(() => {
    if (!assetCtx) {
      return 0;
    }

    const funding = parseFloat(assetCtx.ctx.funding);
    // Convert funding to percentage (funding is already a decimal, multiply by 100)
    return funding * 100;
  }, [assetCtx]);

  // Determine if funding rate is positive or negative
  const isFundingPositive = fundingRate >= 0;

  return (
    <XStack
      paddingHorizontal="$1.5"
      paddingVertical="$2"
      justifyContent="center"
      alignItems="center"
      backgroundColor="$background"
    >
      <YStack alignItems="center" gap="$0.5">
        <Text fontFamily="$interRegular" fontSize="$2" color="$gray10">
          Funding
        </Text>
        <Text
          fontFamily="$interSemiBold"
          fontSize="$3"
          color={isFundingPositive ? '$green9' : '$red9'}
        >
          {isFundingPositive ? '+' : ''}
          {fundingRate.toFixed(4)}%
        </Text>
      </YStack>
    </XStack>
  );
}
