import { ArrowDown, ArrowUp, ArrowLeftRight } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Text, XStack, YStack } from 'tamagui';
import { CardContainer } from '../../global/card-container';

/**
 * Transfer Fund Component
 *
 * Provides quick access to fund management actions:
 * - Deposit: Transfer funds from external wallet to trading account
 * - Withdraw: Transfer funds from trading account to external wallet
 * - Transfer: Move funds between spot and perpetual accounts
 */
export function TransferFund() {
  const router = useRouter();

  const handleDeposit = () => {
    router.navigate({
      pathname: '/(main)/deposit/deposit-hl-bridge',
      params: {
        symbol: 'USDC',
        chain: 'arbitrum',
      },
    });
  };

  const handleWithdraw = () => {
    router.navigate({
      pathname: '/(main)/withdraw/withdraw-hl-bridge',
      params: {
        symbol: 'USDC',
        chain: 'arbitrum',
      },
    });
  };

  const handleTransfer = () => {
    // TODO: Implement transfer functionality
  };

  return (
    <CardContainer>
      <XStack gap="$3" justifyContent="space-between">
        {/* Deposit Button */}
        <YStack
          flex={1}
          alignItems="center"
          gap="$2"
          padding="$3"
          borderRadius="$4"
          backgroundColor="$background02"
          pressStyle={{ opacity: 0.7, scale: 0.98 }}
          onPress={handleDeposit}
          cursor="pointer"
        >
          <ArrowDown size={24} color="$color" />
          <Text fontFamily="$interMedium" fontSize="$3">
            Deposit
          </Text>
        </YStack>

        {/* Withdraw Button */}
        <YStack
          flex={1}
          alignItems="center"
          gap="$2"
          padding="$3"
          borderRadius="$4"
          backgroundColor="$background02"
          pressStyle={{ opacity: 0.7, scale: 0.98 }}
          onPress={handleWithdraw}
          cursor="pointer"
        >
          <ArrowUp size={24} color="$color" />
          <Text fontFamily="$interMedium" fontSize="$3">
            Withdraw
          </Text>
        </YStack>

        {/* Transfer Button */}
        <YStack
          flex={1}
          alignItems="center"
          gap="$2"
          padding="$3"
          borderRadius="$4"
          backgroundColor="$background02"
          pressStyle={{ opacity: 0.7, scale: 0.98 }}
          onPress={handleTransfer}
          cursor="pointer"
        >
          <ArrowLeftRight size={24} color="$color" />
          <Text fontFamily="$interMedium" fontSize="$3">
            Transfer
          </Text>
        </YStack>
      </XStack>
    </CardContainer>
  );
}
