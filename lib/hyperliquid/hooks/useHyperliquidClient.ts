import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { useAgentExchangeClient } from '@/lib/hyperliquid/agent/hooks/useAgentExchangeClient';
import {
  getInfoClient,
  getSubscriptionClient,
  getSymbolConverter,
  getTransport,
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
  const { getProvider, address: walletAddress } = useActiveWallet();
  const { getAgentExchangeClient } = useAgentExchangeClient();

  // Get master exchange client
  const getMasterExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    if (!walletAddress) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
      return undefined;
    }

    try {
      const ethersProvider = await getProvider();
      if (!ethersProvider) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
        return undefined;
      }

      const masterSigner = await ethersProvider.getSigner();

      return new hl.ExchangeClient({
        wallet: masterSigner,
        transport: getTransport(),
      });
    } catch (error) {
      console.error('Failed to get master exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize wallet');
      return undefined;
    }
  }, [walletAddress, getProvider]);

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      getInfoClient,
      getSubscriptionClient,
      getSymbolConverter,
    }),
    [getAgentExchangeClient, getMasterExchangeClient],
  );
}
