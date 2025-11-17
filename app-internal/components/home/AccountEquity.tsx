import { Eye, EyeOff } from '@tamagui/lucide-icons';
import React, { useState } from 'react';
import { Spinner, Text, XStack, YStack, useTheme } from 'tamagui';
import { CardContainer } from '../global/CardContainer';
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
      <XStack alignItems="center" justifyContent="space-between" marginBottom="$2.5">
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
            <EyeOff size={18} color={theme.color12} />
          ) : (
            <Eye size={18} color={theme.color12} />
          )}
        </XStack>
      </XStack>

      {isLoading ? (
        <XStack alignItems="center" gap="$2">
          <Spinner size="small" color="$color9" />
          <Text fontSize="$5" color="$color9">
            Loading...
          </Text>
        </XStack>
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
