import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useAgentExchangeClient } from '@/lib/hyperliquid/agent/hooks/useAgentExchangeClient';
import {
  getInfoClient,
  getSubscriptionClient,
  getSymbolConverter,
  getMasterExchangeClient,
} from '@/lib/hyperliquid/client';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getInfoClient: () => hl.InfoClient;
  getSubscriptionClient: () => hl.SubscriptionClient;
  getSymbolConverter: () => Promise<SymbolConverter>;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { wallet } = useActiveWallet();
  const { getAgentExchangeClient } = useAgentExchangeClient();

  // Get master exchange client (cached by wallet address)
  const getMasterExchangeClientWrapper = useCallback(async (): Promise<
    hl.ExchangeClient | undefined
  > => {
    if (!wallet) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
      return undefined;
    }

    try {
      const ethersProvider = await wallet.getProvider();
      if (!ethersProvider) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
        return undefined;
      }

      const masterSigner = await ethersProvider.getSigner();

      // Use cached ExchangeClient - only creates new instance if wallet changed
      return getMasterExchangeClient(wallet.address, masterSigner);
    } catch (error) {
      console.error('Failed to get master exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize wallet');
      return undefined;
    }
  }, [wallet]);

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient: getMasterExchangeClientWrapper,
      getInfoClient,
      getSubscriptionClient,
      getSymbolConverter,
    }),
    [getAgentExchangeClient, getMasterExchangeClientWrapper],
  );
}
