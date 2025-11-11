import * as hl from '@nktkas/hyperliquid';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { getMasterExchangeClient } from '@/lib/hyperliquid/client/getter';
import { useWalletContext } from '@/core/composition';

export function useMasterExchangeClient() {
  const { wallet } = useWalletContext();

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

      // Create ExchangeClient (transport is singleton, so overhead is minimal)
      return getMasterExchangeClient(masterSigner);
    } catch (error) {
      console.error('Failed to get master exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize wallet');
      return undefined;
    }
  }, [wallet]);

  return {
    getMasterExchangeClient: getMasterExchangeClientWrapper,
  };
}
