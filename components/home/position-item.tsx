import { ChevronDown, ChevronUp } from '@tamagui/lucide-icons';
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

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const isPnlPositive = position.pnl.startsWith('+');
  const pnlColor = isPnlPositive ? '$green9' : '$red9';

  // Pill badge style for leverage and cross mode
  const PillBadge = ({ text, type }: { text: string; type?: 'long' | 'short' | 'neutral' }) => {
    // Define colors based on type
    const getBadgeStyles = () => {
      switch (type) {
        case 'long':
          return {
            borderColor: '$green9',
            bg: '$green2',
            textColor: '$green9',
          };
        case 'short':
          return {
            borderColor: '$red9',
            bg: '$red2',
            textColor: '$red9',
          };
        default:
          return {
            borderColor: '$borderColor',
            bg: '$background02',
            textColor: '$color9',
          };
      }
    };

    const styles = getBadgeStyles();

    return (
      <XStack
        px="$2"
        py="$1"
        borderRadius="$4"
        alignItems="center"
        borderWidth={1}
        borderColor={styles.borderColor}
        bg={styles.bg}
      >
        <Text fontSize="$2" color={styles.textColor}>
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
          <Text fontFamily="$interSemiBold" fontSize="$4" fontWeight="$5">
            {position.symbol}
          </Text>
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
      <XStack padding="$3" paddingTop="$0" justifyContent="space-between" alignItems="center">
        <YStack>
          <Text fontSize="$2" color="$color9">
            Active PNL({position.sizeUnit})
          </Text>
          <Text color={pnlColor} fontFamily="$interSemiBold" fontSize="$4">
            {position.pnl}
          </Text>
        </YStack>

        <Text color={pnlColor} fontFamily="$interSemiBold">
          {position.pnlPercentage}
        </Text>
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
