import * as hl from '@nktkas/hyperliquid';
import { useEffect, useState } from 'react';
import { ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';
import { useHyperliquidClient } from '@/lib/hyperliquid/hooks';
import { useActiveWallet } from '@/lib/riverrun/hooks';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

export default function PositionsTab() {
  const { address, isAuthenticated } = useActiveWallet();
  const { getInfoClient } = useHyperliquidClient();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPositions = async () => {
      if (!address || !isAuthenticated) {
        setPositions([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const clearinghouseState = await getInfoClient().clearinghouseState({ user: address });

        const userPositions = clearinghouseState.assetPositions
          .filter(asset => asset.position && Number(asset.position.szi) !== 0)
          .map(asset => asset.position);

        setPositions(userPositions);
      } catch (err) {
        console.error('Error fetching positions:', err);
        setError('Failed to fetch positions');
        setPositions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPositions();
  }, [address, isAuthenticated]);

  if (!isAuthenticated || !address) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view positions</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2">Loading positions...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10">{error}</Text>
      </View>
    );
  }

  if (positions.length === 0) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No open positions</Text>
      </View>
    );
  }

  const formatNumber = (num: number | string, decimals = 2) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return !isNaN(value) ? value.toFixed(decimals) : '-';
  };

  return (
    <ScrollView flex={1}>
      <YStack padding="$4" gap="$3">
        {positions.map((position, index) => {
          const szi = Number(position.szi);
          const unrealizedPnl = Number(position.unrealizedPnl);
          const positionSide = szi > 0 ? 'Long' : 'Short';
          const isPnlPositive = unrealizedPnl >= 0;

          return (
            <YStack
              key={`${position.coin}-${index}`}
              padding="$4"
              backgroundColor="$gray2"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$gray5"
              gap="$2"
            >
              <XStack justifyContent="space-between" alignItems="center">
                <Text fontSize="$5" fontFamily="$interSemiBold">
                  {position.coin}
                </Text>
                <Text
                  fontSize="$3"
                  color={positionSide === 'Long' ? '$green9' : '$red9'}
                  fontFamily="$interMedium"
                >
                  {positionSide} {formatNumber(Math.abs(szi), 4)}
                </Text>
              </XStack>

              <XStack justifyContent="space-between">
                <YStack gap="$1">
                  <Text fontSize="$2" color="$color9">
                    Entry Price
                  </Text>
                  <Text fontSize="$3" fontFamily="$interMedium">
                    ${formatNumber(position.entryPx)}
                  </Text>
                </YStack>

                <YStack gap="$1" alignItems="flex-end">
                  <Text fontSize="$2" color="$color9">
                    Unrealized PnL
                  </Text>
                  <Text
                    fontSize="$3"
                    fontFamily="$interMedium"
                    color={isPnlPositive ? '$green9' : '$red9'}
                  >
                    {isPnlPositive ? '+' : ''}${formatNumber(unrealizedPnl)}
                  </Text>
                </YStack>
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    </ScrollView>
  );
}
