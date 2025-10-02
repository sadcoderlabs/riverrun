import * as hl from '@nktkas/hyperliquid';
import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { Button } from '../global/button';

type Position = hl.ClearinghouseStateResponse['assetPositions'][number]['position'];

interface PositionItemProps {
  position: Position;
  isExpanded: boolean;
  onToggle: (coin: string) => void;
}

export function PositionItem({ position, isExpanded, onToggle }: PositionItemProps) {
  const theme = useTheme();
  const router = useRouter();

  // Helper functions
  const formatNumber = (num: number | string, decimals = 2) => {
    const value = typeof num === 'string' ? parseFloat(num) : num;
    return !isNaN(value) ? value.toFixed(decimals) : '-';
  };

  const formatPnL = (pnl: number | string) => {
    const value = typeof pnl === 'string' ? parseFloat(pnl) : pnl;
    const formatted = formatNumber(value, 2);
    const sign = value >= 0 ? '+' : '';
    return `${sign}$${formatted}`;
  };

  const getPositionSide = (size: number | string): 'Long' | 'Short' => {
    const value = typeof size === 'string' ? parseFloat(size) : size;
    return value > 0 ? 'Long' : 'Short';
  };

  // Derived values from real data
  const szi = Number(position.szi);
  const entryPx = Number(position.entryPx);
  const unrealizedPnl = Number(position.unrealizedPnl);
  const currentPrice = szi !== 0 ? entryPx + unrealizedPnl / Math.abs(szi) : entryPx;
  const pnlPercentage = Number(position.returnOnEquity) * 100 || 0;
  const leverage = Number(position.leverage?.value) || 1;
  const positionSide = getPositionSide(szi);
  const leverageMode = position.leverage?.type?.toUpperCase() || 'ISOLATED';
  const funding = Number(position.cumFunding?.sinceOpen) || 0;

  const handleToggle = () => {
    onToggle(position.coin);
  };

  const navigateToMarket = () => {
    router.push(`/(main)/trade/${position.coin}/(tab)`);
  };

  const isPnlPositive = unrealizedPnl >= 0;
  const pnlColor = isPnlPositive ? '$green9' : '$red9';
  const isFundingPositive = funding >= 0;

  // Pill badge style for leverage and cross mode
  const PillBadge = ({ text, type }: { text: string; type?: 'long' | 'short' | 'neutral' }) => {
    return (
      <XStack
        px="$2"
        py="$1"
        borderRadius="$4"
        alignItems="center"
        borderWidth={1}
        borderColor={type === 'long' ? '$green9' : type === 'short' ? '$red9' : '$color8'}
        backgroundColor={type === 'long' ? '$green2' : type === 'short' ? '$red2' : '$color2'}
      >
        <Text
          fontSize="$2"
          color={type === 'long' ? '$green9' : type === 'short' ? '$red9' : '$color11'}
        >
          {text}
        </Text>
      </XStack>
    );
  };

  return (
    <YStack borderBottomWidth={1} borderBottomColor="$borderColor" px="$2" py="$3" gap="$2">
      {/* Default state - First row with market pair and chevron */}
      <XStack padding="$3" justifyContent="space-between" alignItems="center">
        <XStack gap="$2" justify={'space-between'} alignItems="center">
          <XStack
            onPress={navigateToMarket}
            pressStyle={{ opacity: 0.7 }}
            borderRadius="$2"
            padding="$1"
          >
            <Text fontFamily="$interSemiBold" fontSize="$4" fontWeight="$5">
              {position.coin}
            </Text>
          </XStack>
          <XStack gap="$2" justifyContent="flex-start" alignItems="center">
            <PillBadge
              text={`${positionSide} ${leverage}x`}
              type={positionSide === 'Long' ? 'long' : 'short'}
            />
            <PillBadge text={leverageMode} type="neutral" />
          </XStack>
        </XStack>

        <XStack padding="$1" borderRadius="$2" pressStyle={{ opacity: 0.7 }} onPress={handleToggle}>
          {isExpanded ? (
            <ChevronUp size={20} color={theme.color9} />
          ) : (
            <ChevronDown size={20} color={theme.color9} />
          )}
        </XStack>
      </XStack>

      {/* Default state - Second row with PNL info */}
      <XStack padding="$3" paddingTop="$0" justifyContent="space-between" alignItems="center">
        <YStack gap="$2" justifyContent="flex-start">
          <Text fontSize="$2" color="$color9">
            Active PNL(USD)
          </Text>
          <XStack justifyContent="flex-start" alignItems="center" gap="$2">
            <Text color={pnlColor} fontFamily="$interSemiBold" fontSize="$4">
              {formatPnL(unrealizedPnl)}
            </Text>
            <Text color={pnlColor} fontFamily="$interSemiBold">
              ({pnlPercentage >= 0 ? '+' : ''}
              {formatNumber(pnlPercentage)}%)
            </Text>
          </XStack>
        </YStack>
        <YStack gap="$2" justifyContent="flex-start">
          <Text fontSize="$2" color="$color9">
            Funding
          </Text>
          <XStack justifyContent="flex-start" alignItems="center" gap="$2">
            <Text
              color={isFundingPositive ? '$green9' : '$red9'}
              fontFamily="$interSemiBold"
              fontSize="$4"
            >
              {isFundingPositive ? '+' : ''}${formatNumber(Math.abs(funding))}
            </Text>
          </XStack>
        </YStack>
      </XStack>

      {/* Expanded state */}
      {isExpanded && (
        <YStack padding="$3" paddingTop="$0">
          {/* 3x3 grid for stats */}
          <YStack gap="$4">
            <XStack justifyContent="space-between">
              {/* First row of stats */}
              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Size({position.coin})
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {formatNumber(Math.abs(szi), 4)}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Value(USD)
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  ${formatNumber(position.positionValue)}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Margin(USD)
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  ${formatNumber(position.marginUsed)}
                </Text>
              </YStack>
            </XStack>

            <XStack justifyContent="space-between">
              {/* Second row of stats */}
              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Avg. Entry
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  ${formatNumber(entryPx)}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Mark price
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  ${formatNumber(currentPrice)}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Liq. price
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {position.liquidationPx ? `$${formatNumber(position.liquidationPx)}` : '-'}
                </Text>
              </YStack>
            </XStack>
          </YStack>

          {/* Action buttons */}
          <XStack gap="$4" pt="$6">
            <Button.Filled flex={1} level="lg">
              Set TP/SL
            </Button.Filled>
            <Button.Filled flex={1} level="lg">
              Close Position
            </Button.Filled>
          </XStack>
        </YStack>
      )}
    </YStack>
  );
}
