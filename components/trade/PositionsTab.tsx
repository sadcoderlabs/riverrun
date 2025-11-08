import { formatPercent } from '@/lib/hyperliquid/format/formatPercent';
import { formatPrice } from '@/lib/hyperliquid/format/formatPrice';
import { formatSize } from '@/lib/hyperliquid/format/formatSize';
import { formatValue } from '@/lib/hyperliquid/format/formatValue';
import { useInfoClient } from '@/lib/hyperliquid/client/useInfoClient';
import { useWebData2Context } from '@/lib/hyperliquid/context/WebData2Context';
import { useActiveWallet } from '@/lib/riverrun/wallet';
import { useMarketsStore } from '@/lib/hyperliquid/market';
import * as hl from '@nktkas/hyperliquid';
import { useEffect, useMemo, useState } from 'react';
import { Button, Spinner, Text, View, XStack, YStack } from 'tamagui';
import ClosePositionModal from './ClosePositionModal';
import TpSlModal from './TpSlModal';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionWithMarkPrice extends Position {
  markPx: string;
  szDecimals: number;
}

export default function PositionsTab() {
  const { wallet } = useActiveWallet();
  const infoClient = useInfoClient();
  const { setSelectedMarketByCoin } = useMarketsStore();

  // Get WebData2 from context (shared across all markets, no re-subscription on market switch)
  const { data: webData, isLoading, error: webError } = useWebData2Context();

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [tpSlModalOpen, setTpSlModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<PositionWithMarkPrice | null>(null);

  // Switch market when position card is clicked (without full page reload)
  const handlePositionClick = (coin: string) => {
    setSelectedMarketByCoin(coin);
    // Note: URL will be automatically synced via bidirectional binding in route component
  };

  // Fetch market data (mark prices and szDecimals) separately
  const [marketDataMap, setMarketDataMap] = useState<
    Map<string, { markPx: string; szDecimals: number }>
  >(new Map());

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        const metaAndAssetCtxs = await infoClient.metaAndAssetCtxs();

        // Create a map of coin -> {markPx, szDecimals} for quick lookup
        const dataMap = new Map<string, { markPx: string; szDecimals: number }>();
        metaAndAssetCtxs[0].universe.forEach((asset, index) => {
          const assetCtx = metaAndAssetCtxs[1][index];
          if (assetCtx) {
            dataMap.set(asset.name, {
              markPx: assetCtx.markPx,
              szDecimals: asset.szDecimals,
            });
          }
        });

        setMarketDataMap(dataMap);
      } catch (err) {
        console.error('Error fetching market data:', err);
      }
    };

    if (wallet) {
      fetchMarketData();
      // Refresh mark prices every 5 seconds
      const interval = setInterval(fetchMarketData, 5000);
      return () => clearInterval(interval);
    }
  }, [wallet, infoClient]);

  // Extract and enrich positions from WebSocket data
  const positions = useMemo<PositionWithMarkPrice[]>(() => {
    if (!webData?.clearinghouseState?.assetPositions) {
      return [];
    }

    return webData.clearinghouseState.assetPositions
      .filter(asset => asset.position && Number(asset.position.szi) !== 0)
      .map(asset => {
        const marketData = marketDataMap.get(asset.position.coin);
        return {
          ...asset.position,
          markPx: marketData?.markPx || '0',
          szDecimals: marketData?.szDecimals || 0,
        };
      });
  }, [webData, marketDataMap]);

  if (!wallet) {
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

  return (
    <YStack gap="$2" paddingBottom="$4">
      {positions.map((position, index) => {
        const szi = Number(position.szi);
        const unrealizedPnl = Number(position.unrealizedPnl);
        const positionSide = szi > 0 ? 'Long' : 'Short';
        const isPnlPositive = unrealizedPnl >= 0;
        const leverage = position.leverage.value;
        const marginMode = position.leverage.type === 'cross' ? 'CROSS' : 'ISOLATED';
        // Funding from API is from funding rate perspective
        // For Long: positive cumFunding = you paid (negative cash flow)
        // For Short: positive cumFunding = you received (positive cash flow)
        // So we need to invert for Long positions
        const fundingFromApi = Number(position.cumFunding.sinceOpen);
        const funding = szi > 0 ? -fundingFromApi : fundingFromApi;
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
            onPress={() => handlePositionClick(position.coin)}
            pressStyle={{ opacity: 0.7, backgroundColor: '$gray3' }}
            cursor="pointer"
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
                  {isPnlPositive ? '+' : ''}${formatValue(unrealizedPnl, 2)} (
                  {isPnlPositive ? '+' : ''}
                  {formatPercent((unrealizedPnl / Number(position.marginUsed)) * 100, 1)})
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
                    {formatSize(Math.abs(szi), position.szDecimals, true)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$1" color="$color9">
                    ENTRY
                  </Text>
                  <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                    {formatPrice(position.entryPx, position.szDecimals, true)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$1" color="$color9">
                    MARK
                  </Text>
                  <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                    {formatPrice(position.markPx, position.szDecimals, true)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$1" color="$color9">
                    MARGIN
                  </Text>
                  <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                    {formatValue(position.marginUsed, 2)}
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
                    ${formatValue(position.positionValue, 2)}
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
                    {isFundingPositive ? '+' : '-'}${formatValue(Math.abs(funding), 2)}
                  </Text>
                </YStack>
                <YStack flex={1}>
                  <Text fontSize="$1" color="$color9">
                    LIQ PRICE
                  </Text>
                  <Text fontSize="$2" fontFamily="$interMedium" numberOfLines={1}>
                    {position.liquidationPx
                      ? formatPrice(position.liquidationPx, position.szDecimals, true)
                      : 'NA'}
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
              <Button
                flex={1}
                size="$2"
                variant="outlined"
                onPress={(e: any) => {
                  e.stopPropagation();
                  setSelectedPosition(position);
                  setTpSlModalOpen(true);
                }}
                pressStyle={{ opacity: 0.8 }}
              >
                Set TP/SL
              </Button>
              <Button
                flex={1}
                size="$2"
                backgroundColor="$red9"
                onPress={(e: any) => {
                  e.stopPropagation();
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

      <ClosePositionModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        position={selectedPosition}
      />
      <TpSlModal open={tpSlModalOpen} onOpenChange={setTpSlModalOpen} position={selectedPosition} />
    </YStack>
  );
}
