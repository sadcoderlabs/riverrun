import { Eye, EyeOff } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Text, XStack, YStack, useTheme } from 'tamagui';
import { CardContainer } from '../global/CardContainer';
import { Skeleton } from '../global/Skeleton';
import { useAccountMetrics } from './hooks/useAccountMetrics';
import { TransferFund } from './TransferFund';

export function AccountEquity() {
  const [isHidden, setIsHidden] = useState(false);
  const theme = useTheme();
  const { totalAccountValue, isLoading, error } = useAccountMetrics();

  const toggleVisibility = () => {
    setIsHidden(!isHidden);
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  };

  return (
    <CardContainer>
      <XStack alignItems="center" justifyContent="flex-start" gap="$2" marginBottom="$2.5">
        <Text color="$color12" fontFamily="$interSemiBold" fontSize="$3">
          Account Equity
        </Text>
        <XStack
          pressStyle={{ opacity: 0.7 }}
          onPress={toggleVisibility}
          padding="$1"
          borderRadius="$2"
          bg="$background02"
        >
          {isHidden ? (
            <EyeOff size={16} color={theme.color12} />
          ) : (
            <Eye size={16} color={theme.color12} />
          )}
        </XStack>
      </XStack>

      {isLoading ? (
        <YStack gap="$3">
          {/* Skeleton for account value */}
          <Skeleton.AccountValue width="60%" height={40} />

          {/* Skeleton for action buttons */}
          <XStack gap="$3" marginTop="$2">
            <Skeleton.Box flex={1} height={48} borderRadius="$12" />
            <Skeleton.Box flex={1} height={48} borderRadius="$12" />
          </XStack>
        </YStack>
      ) : error ? (
        <Text fontSize="$5" color="$red10">
          Failed to load
        </Text>
      ) : (
        <YStack gap="$2">
          {/* Total Account Value */}
          <YStack>
            <Text fontFamily="$interSemiBold" fontSize="$7" marginTop="$1">
              {isHidden ? '••••••' : formatCurrency(totalAccountValue)}
            </Text>
          </YStack>

          {/* Transfer Fund Buttons */}
          <TransferFund />
        </YStack>
      )}
    </CardContainer>
  );
}
