import React from 'react';
import { Text, XStack, YStack } from 'tamagui';

export interface HistoryData {
  id: string;
  symbol: string;
  type: 'Open' | 'Close';
  direction: 'Long' | 'Short';
  timestamp: string;
  size: string;
  sizeUnit: string;
  sizeInUSDC: string;
  price: string;
  fee: string;
}

interface HistoryItemProps {
  history: HistoryData;
}

export function HistoryItem({ history }: HistoryItemProps) {
  // Determine colors based on transaction type
  const isOpen = history.type === 'Open';
  const amountColor = isOpen ? '$red9' : '$green9'; // Negative for open (cost), positive for close (gain)

  // Pill badge for transaction type
  const PillBadge = ({ text, type }: { text: string; type: 'open' | 'close' }) => {
    return (
      <XStack
        px="$2"
        py="$1"
        borderRadius="$4"
        alignItems="center"
        borderWidth={1}
        borderColor={type === 'open' ? '$green9' : '$red9'}
        backgroundColor={type === 'open' ? '$green2' : '$red2'}
      >
        <Text fontSize="$2" color={type === 'open' ? '$green9' : '$red9'}>
          {text}
        </Text>
      </XStack>
    );
  };

  return (
    <YStack borderBottomWidth={1} borderBottomColor="$borderColor" px="$4" py="$6">
      {/* First row: Symbol, Type and Timestamp */}
      <XStack justifyContent="space-between" alignItems="center" mb="$3">
        <XStack gap="$2" alignItems="center">
          <Text fontFamily="$interSemiBold" fontSize="$4">
            {history.symbol}
          </Text>
          <PillBadge
            text={`${history.type} ${history.direction}`}
            type={isOpen ? 'open' : 'close'}
          />
        </XStack>

        <Text color="$color9" fontSize="$2">
          {history.timestamp}
        </Text>
      </XStack>

      {/* Second row: Size */}
      <XStack justifyContent="space-between" alignItems="center" mb="$2">
        <XStack alignItems="center" gap="$1.5">
          <Text color="$color9" fontSize="$3">
            Size
          </Text>
          <Text fontSize="$3" fontFamily="$interMedium">
            {history.size} {history.sizeUnit}
          </Text>
        </XStack>

        <Text fontSize="$4" fontFamily="$interSemiBold" color={amountColor}>
          {isOpen ? '-' : ''}
          {history.sizeInUSDC} USDC
        </Text>
      </XStack>

      {/* Third row: Price and Fee */}
      <XStack justifyContent="space-between" alignItems="center">
        <XStack alignItems="center" gap="$1.5">
          <Text color="$color9" fontSize="$3">
            Price
          </Text>
          <Text fontSize="$3" fontFamily="$interMedium">
            {history.price} USDC
          </Text>
        </XStack>

        <XStack alignItems="center" gap="$1.5">
          <Text color="$color9" fontSize="$3">
            Fee
          </Text>
          <Text fontSize="$3" fontFamily="$interMedium">
            {history.fee} USDC
          </Text>
        </XStack>
      </XStack>
    </YStack>
  );
}
