import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { Button } from '../global/button';

export interface PositionData {
  id: string;
  symbol: string;
  type: 'Long' | 'Short';
  leverage: string;
  crossMode: string;
  size: string;
  sizeUnit: string;
  margin: string;
  marginUnit: string;
  qty: string;
  qtyUnit: string;
  avgEntry: string;
  markPrice: string;
  liqPrice: string;
  pnl: string;
  pnlPercentage: string;
}

interface PositionItemProps {
  position: PositionData;
}

export function PositionItem({ position }: PositionItemProps) {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const router = useRouter();

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const navigateToMarket = () => {
    // Extract the base symbol from the position symbol (e.g., "BTC-USD" -> "BTC-USD")
    const marketId = position.symbol;
    router.push(`/(main)/trade/${marketId}/(tab)`);
  };

  const isPnlPositive = position.pnl.startsWith('+');
  const pnlColor = isPnlPositive ? '$green9' : '$red9';

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
    <YStack borderBottomWidth={1} borderBottomColor="$borderColor" p="$2" gap="$2">
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
              {position.symbol}
            </Text>
          </XStack>
          <XStack gap="$2" justifyContent="flex-start" alignItems="center">
            <PillBadge
              text={`${position.type} ${position.leverage}`}
              type={position.type === 'Long' ? 'long' : 'short'}
            />
            <PillBadge text={position.crossMode} type="neutral" />
          </XStack>
        </XStack>

        <XStack
          padding="$1"
          borderRadius="$2"
          pressStyle={{ opacity: 0.7 }}
          onPress={toggleExpanded}
        >
          {expanded ? (
            <ChevronUp size={20} color={theme.color9} />
          ) : (
            <ChevronDown size={20} color={theme.color9} />
          )}
        </XStack>
      </XStack>

      {/* Default state - Second row with PNL info */}
      <XStack padding="$3" paddingTop="$0" justifyContent="flex-start" alignItems="center">
        <YStack gap="$2" justifyContent="flex-start">
          <Text fontSize="$2" color="$color9">
            Active PNL({position.sizeUnit})
          </Text>
          <XStack justifyContent="flex-start" alignItems="center" gap="$2">
            <Text color={pnlColor} fontFamily="$interSemiBold" fontSize="$4">
              {position.pnl}
            </Text>
            <Text color={pnlColor} fontFamily="$interSemiBold">
              ({position.pnlPercentage})
            </Text>
          </XStack>
        </YStack>
      </XStack>

      {/* Expanded state */}
      {expanded && (
        <YStack padding="$3" paddingTop="$0">
          {/* 3x3 grid for stats */}
          <YStack gap="$4">
            <XStack justifyContent="space-between">
              {/* First row of stats */}
              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  QTY({position.qtyUnit})
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {position.qty}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Size({position.sizeUnit})
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {position.size}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Margin({position.marginUnit})
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {position.margin}
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
                  {position.avgEntry}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Mark price
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {position.markPrice}
                </Text>
              </YStack>

              <YStack flex={1}>
                <Text fontSize="$2" color="$color9">
                  Liq. price
                </Text>
                <Text fontSize="$3" fontFamily="$interMedium">
                  {position.liqPrice}
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
