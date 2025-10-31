import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import { useHyperliquidClient } from './useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

interface UseSpotSendResult {
  send: (destination: string, token: string, amount: string) => Promise<boolean>;
  isSending: boolean;
  error: string | null;
}

/**
 * Hook to send spot tokens on Hyperliquid
 *
 * Uses the spotSend action to transfer spot tokens between Hyperliquid addresses.
 * This is used for Unit Protocol withdrawals where tokens are sent to a Unit-controlled
 * Hyperliquid address that forwards them to the destination chain.
 *
 * @returns send function, sending state, and error
 */
export function useSpotSend(): UseSpotSendResult {
  const { address } = useActiveWallet();
  const { getMasterExchangeClient } = useHyperliquidClient();

  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Send spot tokens to a destination address
   *
   * @param destination - Hyperliquid destination address (0x...)
   * @param token - Token identifier in format "NAME:ID" (e.g., "ETH:0x...")
   * @param amount - Amount to send as decimal string (e.g., "0.05")
   * @returns true if successful, false otherwise
   */
  const send = useCallback(
    async (destination: string, token: string, amount: string): Promise<boolean> => {
      if (!address) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
        return false;
      }

      try {
        setIsSending(true);
        setError(null);

        // Get master exchange client (requires user wallet approval)
        const exchangeClient = await getMasterExchangeClient();
        if (!exchangeClient) {
          Alert.alert('Failed', 'Failed to initialize exchange client');
          return false;
        }

        // Execute spotSend
        const response = await exchangeClient.spotSend({
          destination: destination as `0x${string}`,
          token: token,
          amount: amount,
        });

        if (response.status === 'ok') {
          return true;
        } else {
          setError('Spot send transaction failed');
          Alert.alert('Transaction Failed', 'The spot send transaction was not successful.');
          return false;
        }
      } catch (err) {
        console.error('Spot send error:', err);
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
        setError(errorMessage);
        Alert.alert('Transaction Failed', errorMessage);
        return false;
      } finally {
        setIsSending(false);
      }
    },
    [address, getMasterExchangeClient],
  );

  return {
    send,
    isSending,
    error,
  };
}
