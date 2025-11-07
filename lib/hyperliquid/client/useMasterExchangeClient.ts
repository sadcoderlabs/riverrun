import * as hl from '@nktkas/hyperliquid';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { getMasterExchangeClient } from '@/lib/hyperliquid/client/getter';
import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';

export function useMasterExchangeClient() {
  const { wallet } = useActiveWallet();

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

  return {
    getMasterExchangeClient: getMasterExchangeClientWrapper,
  };
}
