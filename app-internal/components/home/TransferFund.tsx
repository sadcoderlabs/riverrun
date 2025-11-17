import { ArrowDown, ArrowUp } from '@tamagui/lucide-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { XStack } from 'tamagui';
import { Button } from '../global/Button';

/**
 * Transfer Fund Component
 *
 * Provides quick access to fund management actions:
 * - Deposit: Transfer USDC from Arbitrum to Hyperliquid
 * - Withdraw: Transfer USDC from Hyperliquid to Arbitrum
 *
 * Now designed as a row of action buttons rather than a card container
 */
export function TransferFund() {
  const router = useRouter();

  const handleDeposit = () => {
    router.navigate({
      pathname: '/deposit/deposit-hl-bridge',
      params: {
        symbol: 'USDC',
        chain: 'arbitrum',
      },
    });
  };

  const handleWithdraw = () => {
    router.navigate({
      pathname: '/withdraw/withdraw-hl-bridge',
      params: {
        symbol: 'USDC',
        chain: 'arbitrum',
      },
    });
  };

  return (
    <XStack gap="$3" justifyContent="space-between" marginTop="$3">
      {/* Deposit Button - More eye-catching with Filled variant */}
      <Button.Filled
        onPress={handleDeposit}
        flex={1}
        level="md"
        height="$5"
        fontSize="$3"
        pressStyle={{ opacity: 0.85, scale: 0.98 }}
      >
        Deposit
        <ArrowDown size={18} color="$color1" marginLeft="$1.5" />
      </Button.Filled>

      {/* Withdraw Button - Less prominent with Gray variant */}
      <Button.Gray
        onPress={handleWithdraw}
        flex={1}
        level="md"
        height="$5"
        fontSize="$3" // Slightly larger text
        pressStyle={{ opacity: 0.85, scale: 0.98 }}
      >
        Withdraw
        <ArrowUp size={18} color="$accent9" marginLeft="$1.5" />
      </Button.Gray>
    </XStack>
  );
}
