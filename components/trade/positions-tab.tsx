import * as hl from '@nktkas/hyperliquid';
import { useEffect, useMemo, useState } from 'react';
import { Button, ScrollView, Spinner, Text, View, XStack, YStack } from 'tamagui';
import { useHyperliquidClient, useWebData2 } from '@/lib/hyperliquid/hooks';
import { useActiveWallet } from '@/lib/riverrun/hooks';
import ClosePositionModal from './close-position-modal';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionWithMarkPrice extends Position {
  markPx: string;
}

export default function PositionsTab() {
  const { address, isAuthenticated } = useActiveWallet();
  const { getInfoClient } = useHyperliquidClient();

  // Subscribe to real-time WebSocket updates
  const { data: webData, isLoading, error: webError } = useWebData2();

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionWithMarkPrice | null>(null);

  // Fetch market data (mark prices) separately
  const [markPriceMap, setMarkPriceMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const metaAndAssetCtxs = await getInfoClient().metaAndAssetCtxs();

        // Create a map of coin -> mark price for quick lookup
        const priceMap = new Map<string, string>();
        metaAndAssetCtxs[0].universe.forEach((asset, index) => {
          const assetCtx = metaAndAssetCtxs[1][index];
          if (assetCtx) {
            priceMap.set(asset.name, assetCtx.markPx);
          }
        });

        setMarkPriceMap(priceMap);
      } catch (err) {
        console.error('Error fetching market data:', err);
      }
    };

    if (isAuthenticated) {
      fetchMarketData();
      // Refresh mark prices every 5 seconds
      const interval = setInterval(fetchMarketData, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, getInfoClient]);

  // Extract and enrich positions from WebSocket data
  const positions = useMemo<PositionWithMarkPrice[]>(() => {
    if (!webData?.clearinghouseState?.assetPositions) {
      return [];
    }

    return webData.clearinghouseState.assetPositions
      .filter(asset => asset.position && Number(asset.position.szi) !== 0)
      .map(asset => ({
        ...asset.position,
        markPx: markPriceMap.get(asset.position.coin) || '0',
      }));
  }, [webData, markPriceMap]);

  if (!isAuthenticated || !address) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>Please connect your wallet to view positions</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View flex={1} justifyContent="center" alignItems="center">
        <Spinner size="large" />
        <Text marginTop="$2">Loading positions...</Text>
      </View>
    );
  }

  if (webError) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text color="$red10">{webError.message}</Text>
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
      <YStack gap="$2">
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
              padding="$3"
              backgroundColor="$gray2"
              borderRadius="$3"
              borderWidth={1}
              borderColor="$gray5"
              gap="$2"
            >
              {/* Header Section */}
              <XStack justifyContent="space-between" alignItems="flex-start">
                {/* Left: Coin name, badge, and direction/leverage */}
                <YStack gap="$1">
                  <XStack gap="$2" alignItems="center">
                    <Text fontSize="$5" fontFamily="$interSemiBold">
                      {position.coin}-USD
                    </Text>
                    {position.leverage.type === 'cross' && (
                      <View
                        backgroundColor="orange"
                        paddingHorizontal="$1.5"
                        paddingVertical="$0.5"
                        borderRadius="$2"
                      >
                        <Text fontSize="$1" fontFamily="$interMedium" color="white">
                          CROSS
                        </Text>
                      </View>
                    )}
                  </XStack>
                  <Text
                    fontSize="$3"
                    color={positionSide === 'Long' ? '$green10' : '$red10'}
                    fontFamily="$interSemiBold"
                  >
                    {positionSide} {leverage}x
                  </Text>
                </YStack>

                {/* Right: Unrealized PnL */}
                <YStack alignItems="flex-end" gap="$0.5">
                  <Text fontSize="$1" color="$color9">
                    Unrealised P&L
                  </Text>
                  <Text
                    fontSize="$4"
                    fontFamily="$interSemiBold"
                    color={isPnlPositive ? '$green10' : '$red10'}
                  >
                    {isPnlPositive ? '+' : ''}${formatNumber(unrealizedPnl)} (
                    {formatNumber((unrealizedPnl / Number(position.marginUsed)) * 100)}%)
                  </Text>
                </YStack>
              </XStack>

              {/* Metrics Grid - 2 Rows x 4 Columns */}
              <YStack gap="$1.5">
                {/* Row 1: SIZE | ENTRY | MARK | MARGIN */}
                <XStack gap="$2">
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      SIZE
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      {formatNumber(Math.abs(szi), 4)}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      ENTRY
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      {formatCompactNumber(position.entryPx)}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      MARK
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      {formatCompactNumber(position.markPx)}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      MARGIN
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      {formatNumber(Number(position.marginUsed))}
                    </Text>
                  </YStack>
                </XStack>

                {/* Row 2: VALUE | FUNDING | LIQ PRICE | MODE */}
                <XStack gap="$2">
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      VALUE
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      ${formatCompactNumber(position.positionValue)}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      FUNDING
                    </Text>
                    <Text
                      fontSize="$2"
                      fontFamily="$interMedium"
                      color={isFundingPositive ? '$green10' : '$red10'}
                      numberOfLines={1}
                    >
                      {isFundingPositive ? '+' : ''}${formatNumber(funding)}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      LIQ PRICE
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      {position.liquidationPx ? formatCompactNumber(position.liquidationPx) : 'NA'}
                    </Text>
                  </YStack>
                  <YStack flex={1}>
                    <Text fontSize="$1" color="$color9">
                      MODE
                    </Text>
                    <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                      {marginMode}
                    </Text>
                  </YStack>
                </XStack>
              </YStack>

              {/* Action Buttons */}
              <XStack gap="$2" marginTop="$1">
                <Button flex={1} size="$2" variant="outlined" disabled>
                  Set TP/SL
                </Button>
                <Button
                  flex={1}
                  size="$2"
                  backgroundColor="$red9"
                  onPress={() => {
                    setSelectedPosition(position);
                    setCloseModalOpen(true);
                  }}
                  pressStyle={{ opacity: 0.8 }}
                >
                  Close position
                </Button>
              </XStack>
            </YStack>
          );
        })}
      </YStack>

      <ClosePositionModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        position={selectedPosition}
      />
    </ScrollView>
  );
}
