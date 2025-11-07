import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useHyperliquidClient } from './useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

// Minimum withdrawal amount in USDC
export const MIN_WITHDRAW_AMOUNT = 2;

interface UseHyperliquidWithdrawResult {
  withdrawableBalance: string | null;
  isLoadingBalance: boolean;
  isWithdrawing: boolean;
  refreshBalance: () => Promise<void>;
  withdraw: (destinationAddress: string, amount: string) => Promise<boolean>;
  minWithdrawAmount: number;
}

/**
 * Hook for Hyperliquid USDC withdrawal functionality
 *
 * Provides methods to:
 * - Query withdrawable USDC balance from Hyperliquid
 * - Execute USDC withdrawal to Arbitrum network
 */
export function useHyperliquidWithdraw(): UseHyperliquidWithdrawResult {
  const { wallet } = useActiveWallet();
  const { getMasterExchangeClient, getInfoClient } = useHyperliquidClient();

  const [withdrawableBalance, setWithdrawableBalance] = useState<string | null>(null);
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  /**
   * Query withdrawable USDC balance from Hyperliquid
   * Uses clearinghouseState API to get the withdrawable amount
   */
  const refreshBalance = useCallback(async () => {
    if (!wallet) {
      setWithdrawableBalance(null);
      return;
    }

    try {
      setIsLoadingBalance(true);
      const infoClient = getInfoClient();
      const state = await infoClient.clearinghouseState({ user: wallet.address });
      setWithdrawableBalance(state.withdrawable);
    } catch (error) {
      console.error('Failed to fetch withdrawable balance:', error);
      setWithdrawableBalance(null);
      Alert.alert(
        'Balance Fetch Failed',
        error instanceof Error ? error.message : 'Failed to fetch balance',
      );
    } finally {
      setIsLoadingBalance(false);
    }
  }, [wallet, getInfoClient]);

  /**
   * Execute USDC withdrawal to Arbitrum
   *
   * @param destinationAddress - Arbitrum address to receive USDC
   * @param amount - Amount to withdraw (as string, e.g., "10.5" for $10.50)
   * @returns Promise<boolean> - true if withdrawal succeeded, false otherwise
   */
  const withdraw = useCallback(
    async (destinationAddress: string, amount: string): Promise<boolean> => {
      if (!wallet) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
        return false;
      }

      // Validate minimum withdrawal amount
      const numAmount = parseFloat(amount);
      if (numAmount < MIN_WITHDRAW_AMOUNT) {
        Alert.alert('Amount Too Low', `Minimum withdrawal amount is ${MIN_WITHDRAW_AMOUNT} USDC`);
        return false;
      }

      try {
        setIsWithdrawing(true);

        // Get master exchange client (requires user wallet approval)
        const exchangeClient = await getMasterExchangeClient();
        if (!exchangeClient) {
          Alert.alert('Failed', 'Failed to initialize exchange client');
          return false;
        }

        // Execute withdrawal using withdraw3 API
        const response = await exchangeClient.withdraw3({
          destination: destinationAddress as `0x${string}`,
          amount: amount,
        });

        if (response.status === 'ok') {
          Alert.alert(
            'Withdrawal Initiated',
            'Your withdrawal has been submitted successfully. Funds will arrive in 3-4 minutes.\n\nNote: A $1 withdrawal fee has been deducted.',
            [{ text: 'OK' }],
          );

          // Refresh balance after successful withdrawal
          await refreshBalance();
          return true;
        } else {
          Alert.alert('Withdrawal Failed', 'The withdrawal request was not successful.');
          return false;
        }
      } catch (error) {
        console.error('Withdrawal error:', error);
        Alert.alert(
          'Withdrawal Failed',
          error instanceof Error ? error.message : 'An unknown error occurred',
        );
        return false;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [wallet, getMasterExchangeClient, refreshBalance],
  );

  return {
    withdrawableBalance,
    isLoadingBalance,
    isWithdrawing,
    refreshBalance,
    withdraw,
    minWithdrawAmount: MIN_WITHDRAW_AMOUNT,
  };
}
