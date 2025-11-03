import * as hl from '@nktkas/hyperliquid';
import { useEffect, useState } from 'react';
import { Button, ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';
import { useHyperliquidClient } from '@/lib/hyperliquid/hooks';
import { useActiveWallet } from '@/lib/riverrun/hooks';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionWithMarkPrice extends Position {
  markPx: string;
}

export default function PositionsTab() {
  const { address, isAuthenticated } = useActiveWallet();
  const { getInfoClient } = useHyperliquidClient();
  const [positions, setPositions] = useState<PositionWithMarkPrice[]>([]);
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

        // Fetch both clearinghouse state and market data
        const [clearinghouseState, metaAndAssetCtxs] = await Promise.all([
          getInfoClient().clearinghouseState({ user: address }),
          getInfoClient().metaAndAssetCtxs(),
        ]);

        // Create a map of coin -> mark price for quick lookup
        const markPriceMap = new Map<string, string>();
        metaAndAssetCtxs[0].universe.forEach((asset, index) => {
          const assetCtx = metaAndAssetCtxs[1][index];
          if (assetCtx) {
            markPriceMap.set(asset.name, assetCtx.markPx);
          }
        });

        // Filter and enrich positions with mark price
        const userPositions = clearinghouseState.assetPositions
          .filter(asset => asset.position && Number(asset.position.szi) !== 0)
          .map(asset => ({
            ...asset.position,
            markPx: markPriceMap.get(asset.position.coin) || '0',
          }));

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
  }, [address, isAuthenticated, getInfoClient]);

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

  const formatCompactNumber = (num: number | string) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(value)) return '-';
    if (Math.abs(value) >= 1000) {
      return value.toFixed(0);
    }
    return value.toFixed(2);
  };

  return (
    <ScrollView flex={1}>
      <YStack padding="$4" gap="$3">
        {positions.map((position, index) => {
          const szi = Number(position.szi);
          const unrealizedPnl = Number(position.unrealizedPnl);
          const positionSide = szi > 0 ? 'Long' : 'Short';
          const isPnlPositive = unrealizedPnl >= 0;
          const leverage = position.leverage.value;
          const marginMode = position.leverage.type === 'cross' ? 'CROSS' : 'ISOLATED';
          const funding = Number(position.cumFunding.sinceOpen);
          const isFundingPositive = funding >= 0;

          return (
            <YStack
              key={`${position.coin}-${index}`}
              padding="$4"
              backgroundColor="$gray2"
              borderRadius="$4"
              borderWidth={1}
              borderColor="$gray5"
              gap="$3"
            >
              {/* Header: Coin name and mode badge */}
              <XStack justifyContent="space-between" alignItems="center">
                <XStack gap="$2" alignItems="center">
                  <Text fontSize="$6" fontFamily="$interSemiBold">
                    {position.coin}
                  </Text>
                  {position.leverage.type === 'cross' && (
                    <View
                      backgroundColor="orange"
                      paddingHorizontal="$2"
                      paddingVertical="$1"
                      borderRadius="$2"
                    >
                      <Text fontSize="$1" fontFamily="$interMedium" color="white">
                        CROSS
                      </Text>
                    </View>
                  )}
                </XStack>
              </XStack>

              {/* Direction, Leverage and Unrealized PnL */}
              <XStack justifyContent="space-between" alignItems="center">
                <Text
                  fontSize="$4"
                  color={positionSide === 'Long' ? '$green10' : '$red10'}
                  fontFamily="$interSemiBold"
                >
                  {positionSide} {leverage}x
                </Text>
                <YStack alignItems="flex-end">
                  <Text fontSize="$2" color="$color9">
                    Unrealised P&L
                  </Text>
                  <Text
                    fontSize="$5"
                    fontFamily="$interSemiBold"
                    color={isPnlPositive ? '$green10' : '$red10'}
                  >
                    {isPnlPositive ? '+' : ''}${formatNumber(unrealizedPnl)} (
                    {formatNumber((unrealizedPnl / Number(position.marginUsed)) * 100)}%)
                  </Text>
                </YStack>
              </XStack>

              {/* Metrics Grid */}
              <YStack gap="$2">
                {/* Row 1: SIZE and VALUE */}
                <XStack justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$2" color="$color9">
                      SIZE
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      {formatNumber(Math.abs(szi), 4)}
                    </Text>
                  </YStack>
                  <YStack flex={1} gap="$1" alignItems="flex-end">
                    <Text fontSize="$2" color="$color9">
                      VALUE
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      ${formatCompactNumber(position.positionValue)}
                    </Text>
                  </YStack>
                </XStack>

                {/* Row 2: ENTRY and FUNDING */}
                <XStack justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$2" color="$color9">
                      ENTRY
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      {formatCompactNumber(position.entryPx)}
                    </Text>
                  </YStack>
                  <YStack flex={1} gap="$1" alignItems="flex-end">
                    <Text fontSize="$2" color="$color9">
                      FUNDING
                    </Text>
                    <Text
                      fontSize="$3"
                      fontFamily="$interMedium"
                      color={isFundingPositive ? '$green10' : '$red10'}
                    >
                      {isFundingPositive ? '+' : ''}${formatNumber(funding)}
                    </Text>
                  </YStack>
                </XStack>

                {/* Row 3: MARK and LIQ PRICE */}
                <XStack justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$2" color="$color9">
                      MARK
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      {formatCompactNumber(position.markPx)}
                    </Text>
                  </YStack>
                  <YStack flex={1} gap="$1" alignItems="flex-end">
                    <Text fontSize="$2" color="$color9">
                      LIQ PRICE
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      {position.liquidationPx ? formatCompactNumber(position.liquidationPx) : 'NA'}
                    </Text>
                  </YStack>
                </XStack>

                {/* Row 4: MARGIN and MODE */}
                <XStack justifyContent="space-between">
                  <YStack flex={1} gap="$1">
                    <Text fontSize="$2" color="$color9">
                      MARGIN
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      {formatNumber(Number(position.marginUsed))}
                    </Text>
                  </YStack>
                  <YStack flex={1} gap="$1" alignItems="flex-end">
                    <Text fontSize="$2" color="$color9">
                      MODE
                    </Text>
                    <Text fontSize="$3" fontFamily="$interMedium">
                      {marginMode}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              {/* Action Buttons */}
              <XStack gap="$2" marginTop="$2">
                <Button flex={1} size="$3" variant="outlined" disabled>
                  Set TP/SL
                </Button>
                <Button flex={1} size="$3" backgroundColor="$red9" disabled>
                  Close position
                </Button>
              </XStack>
            </YStack>
          );
        })}
      </YStack>
    </ScrollView>
  );
}
