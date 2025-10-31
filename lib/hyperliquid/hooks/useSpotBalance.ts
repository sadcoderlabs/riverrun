import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useHyperliquidClient } from './useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

interface SpotToken {
  name: string;
  szDecimals: number;
  weiDecimals: number;
  index: number;
  tokenId: string;
  evmContract: {
    address: `0x${string}`;
    evm_extra_wei_decimals: number;
  } | null;
}

interface UseSpotBalanceResult {
  balance: string | null;
  tokenInfo: SpotToken | null;
  isLoading: boolean;
  error: string | null;
  refreshBalance: () => Promise<void>;
}

/**
 * Hook to get user's spot token balance and metadata
 *
 * @param tokenSymbol - Token symbol (e.g., "ETH", "BTC", "SOL")
 * @returns Balance, token info, loading state, and refresh function
 */
export function useSpotBalance(tokenSymbol: string): UseSpotBalanceResult {
  const { address } = useActiveWallet();
  const { getInfoClient } = useHyperliquidClient();

  const [balance, setBalance] = useState<string | null>(null);
  const [tokenInfo, setTokenInfo] = useState<SpotToken | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshBalance = useCallback(async () => {
    if (!address) {
      setBalance(null);
      setTokenInfo(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const infoClient = getInfoClient();

      // Step 1: Get spot metadata to find token info
      const spotMeta = await infoClient.spotMeta();

      // Find token by symbol
      const token = spotMeta.tokens.find(t => t.name.toUpperCase() === tokenSymbol.toUpperCase());

      if (!token) {
        throw new Error(`Token ${tokenSymbol} not found in spot meta`);
      }

      // Store token info
      setTokenInfo({
        name: token.name,
        szDecimals: token.szDecimals,
        weiDecimals: token.weiDecimals,
        index: token.index,
        tokenId: token.tokenId,
        evmContract: token.evmContract ?? null,
      });

      // Step 2: Get user's spot balances
      const spotState = await infoClient.spotClearinghouseState({ user: address });

      // Find balance for this token by index
      const tokenBalance = spotState.balances.find(
        (b: { coin: string; token: number; total: string; hold: string; entryNtl: string }) =>
          b.token === token.index,
      );

      if (tokenBalance) {
        setBalance(tokenBalance.total);
      } else {
        // Token exists but user has 0 balance
        setBalance('0');
      }
    } catch (err) {
      console.error('Failed to fetch spot balance:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch balance');
      setBalance(null);
      setTokenInfo(null);
    } finally {
      setIsLoading(false);
    }
  }, [address, tokenSymbol, getInfoClient]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    refreshBalance();
  }, [refreshBalance]);

  return {
    balance,
    tokenInfo,
    isLoading,
    error,
    refreshBalance,
  };
}
