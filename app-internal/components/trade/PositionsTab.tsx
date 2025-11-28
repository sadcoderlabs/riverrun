import { useMarket, usePositionStore, useWallet } from '@/app-internal';
import type { EnrichedPosition } from '@/app-internal/features/position/types/position';
import { calculatePositionMetrics } from '@/app-internal/features/position/types/position';
import { formatPercent } from '@/infra/hyperliquid/format/formatPercent';
import { formatPrice } from '@/infra/hyperliquid/format/formatPrice';
import { formatSize } from '@/infra/hyperliquid/format/formatSize';
import { formatValue } from '@/infra/hyperliquid/format/formatValue';
import { useState } from 'react';
import { Spinner, Text, View, XStack, YStack } from 'tamagui';
import { Button } from '../global';
import ClosePositionModal from './ClosePositionModal';
import TpSlModal from './TpSlModal';

export default function PositionsTab() {
  const { wallet } = useWallet();
  const { setSelectedMarketByCoin } = useMarket();

  // Get positions from position context (business logic handled by PositionService)
  const positions = usePositionStore(state => state.positions);
  const isLoading = usePositionStore(state => state.isLoading);

  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [tpSlModalOpen, setTpSlModalOpen] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<EnrichedPosition | null>(null);

  // Switch market when position card is clicked (without full page reload)
  const handlePositionClick = (coin: string) => {
    setSelectedMarketByCoin(coin);
  };

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

  if (positions.length === 0) {
    return (
      <View flex={1} justifyContent="center" alignItems="center" padding="$4">
        <Text>No open positions</Text>
      </View>
    );
  }

  return (
    <YStack gap="$2" paddingBottom="$4">
      {positions.map((position, index) => (
        <PositionCard
          key={`${position.coin}-${index}`}
          position={position}
          onPositionClick={handlePositionClick}
          onCloseClick={() => {
            setSelectedPosition(position);
            setCloseModalOpen(true);
          }}
          onTpSlClick={() => {
            setSelectedPosition(position);
            setTpSlModalOpen(true);
          }}
        />
      ))}

      <ClosePositionModal
        open={closeModalOpen}
        onOpenChange={setCloseModalOpen}
        position={selectedPosition}
      />
      <TpSlModal open={tpSlModalOpen} onOpenChange={setTpSlModalOpen} position={selectedPosition} />
    </YStack>
  );
}

/**
 * Position Card Component
 *
 * Displays a single position with calculated metrics.
 */
interface PositionCardProps {
  position: EnrichedPosition;
  onPositionClick: (coin: string) => void;
  onCloseClick: () => void;
  onTpSlClick: () => void;
}

function PositionCard({ position, onPositionClick, onCloseClick, onTpSlClick }: PositionCardProps) {
  // Calculate metrics using business logic
  const metrics = calculatePositionMetrics(position);

  const szi = Number(position.szi);
  const unrealizedPnl = Number(position.unrealizedPnl);
  const leverage = position.leverage.value;
  const marginMode = position.leverage.type === 'cross' ? 'CROSS' : 'ISOLATED';

  return (
    <YStack
      padding="$3"
      backgroundColor="$gray2"
      borderRadius="$3"
      borderWidth={1}
      borderColor="$gray5"
      gap="$2"
      onPress={() => onPositionClick(position.coin)}
      pressStyle={{ opacity: 0.7, backgroundColor: '$gray3' }}
      cursor="pointer"
    >
      {/* Header Section */}
      <XStack justifyContent="space-between" alignItems="flex-start">
        {/* Left: Coin name, badge, and direction/leverage */}
        <XStack gap="$1" justifyContent="space-between" alignItems="center">
          <XStack gap="$2" alignItems="center">
            <Text fontFamily="$interBold" fontSize="$3">
              {position.coin}-USDC
            </Text>
            {position.leverage.type === 'cross' && (
              <View
                backgroundColor="$gray3"
                paddingHorizontal="$2"
                paddingVertical="$1"
                borderRadius="$4"
              >
                <Text fontSize="$1" fontFamily="$interMedium" color="$color12">
                  CROSS
                </Text>
              </View>
            )}
            <View
              backgroundColor={metrics.side === 'Long' ? '$green3' : '$red3'}
              paddingHorizontal="$2"
              paddingVertical="$1"
              borderRadius="$4"
            >
              <Text fontSize="$1" color={metrics.side === 'Long' ? '$green12' : '$red12'}>
                {metrics.side.toUpperCase()} {leverage}X
              </Text>
            </View>
          </XStack>
        </XStack>
      </XStack>

      <XStack justifyContent="space-between" alignItems="center">
        <Text fontSize="$2" color="$color9">
          Unrealised P&L
        </Text>
        <Text
          fontSize="$3"
          fontFamily="$interMedium"
          color={metrics.isPnlPositive ? '$green10' : '$red10'}
        >
          {metrics.isPnlPositive ? '+' : ''}${formatValue(unrealizedPnl, 2)} (
          {metrics.isPnlPositive ? '+' : ''}
          {formatPercent((unrealizedPnl / Number(position.marginUsed)) * 100, 1)})
        </Text>
      </XStack>

      {/* Metrics Grid - 2 Rows x 4 Columns */}
      <YStack gap="$1.5" paddingVertical="$3">
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
              color={metrics.isFundingPositive ? '$green10' : '$red10'}
              numberOfLines={1}
            >
              {metrics.isFundingPositive ? '+' : '-'}${formatValue(Math.abs(metrics.funding), 2)}
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
        <Button.Filled
          flex={1}
          size="$2"
          height="$3"
          onPress={(e: any) => {
            e.stopPropagation();
            onTpSlClick();
          }}
          pressStyle={{ opacity: 0.8 }}
        >
          Set TP/SL
        </Button.Filled>
        <Button.Tinted
          flex={1}
          size="$2"
          height="$3"
          onPress={(e: any) => {
            e.stopPropagation();
            onCloseClick();
          }}
          pressStyle={{ opacity: 0.8 }}
        >
          Close Position
        </Button.Tinted>
      </XStack>
    </YStack>
  );
}
