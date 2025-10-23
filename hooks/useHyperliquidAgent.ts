import * as hl from '@nktkas/hyperliquid';
import { useAppKitProvider } from '@reown/appkit-ethers-react-native';
import { useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';
import { BrowserProvider } from 'ethers';

import { DEFAULT_AGENT_NAME, getOrCreateAgentSigner } from '@/lib/hyperliquid/agent';

interface UseHyperliquidAgentResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  infoClient: hl.InfoClient;
}

export function useHyperliquidAgent(): UseHyperliquidAgentResult {
  const { walletProvider } = useAppKitProvider();

  const transportRef = useRef<hl.HttpTransport | undefined>(undefined);
  const infoClientRef = useRef<hl.InfoClient | undefined>(undefined);

  if (!transportRef.current) {
    transportRef.current = new hl.HttpTransport();
  }

  const transport = transportRef.current;
  if (!infoClientRef.current) {
    infoClientRef.current = new hl.InfoClient({ transport });
  }

  const infoClient = infoClientRef.current;

  // Helper function to check if agent is approved
  const checkAgentApproval = useCallback(
    async (masterAddress: string, agentAddress: string): Promise<boolean> => {
      const existingAgents = await infoClient.extraAgents({ user: masterAddress });
      return existingAgents.some(
        agent => agent.address.toLowerCase() === agentAddress.toLowerCase(),
      );
    },
    [infoClient],
  );

  // Get master exchange client
  const getMasterExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    if (!walletProvider) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
      return undefined;
    }

    try {
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const masterSigner = await ethersProvider.getSigner();

      return new hl.ExchangeClient({
        wallet: masterSigner,
        transport,
      });
    } catch (error) {
      console.error('Failed to get master exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize wallet');
      return undefined;
    }
  }, [walletProvider, transport]);

  // Get agent exchange client with approval flow
  const getAgentExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    if (!walletProvider) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
      return undefined;
    }

    try {
      // Setup master wallet
      const ethersProvider = new BrowserProvider(walletProvider as any);
      const masterSigner = await ethersProvider.getSigner();
      const masterAddress = (await masterSigner.getAddress()).toLowerCase();

      // Setup agent wallet
      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const agentAddress = await agentSigner.getAddress();

      // Create agent exchange client
      const agentExchangeClient = new hl.ExchangeClient({
        wallet: agentSigner,
        transport,
      });

      // Check if agent is already approved
      const isApproved = await checkAgentApproval(masterAddress, agentAddress);

      if (isApproved) {
        return agentExchangeClient;
      }

      // Agent not approved - show confirmation dialog

      return await new Promise<hl.ExchangeClient | undefined>(resolve => {
        Alert.alert(
          'Agent Approval Required',
          'This action requires agent approval. You will be redirected to your wallet app to approve the agent. Do you want to continue?',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(undefined),
            },
            {
              text: 'Confirm',
              onPress: async () => {
                try {
                  // Create master exchange client for approval
                  const masterExchangeClient = new hl.ExchangeClient({
                    wallet: masterSigner,
                    transport,
                  });

                  // Approve the agent
                  await masterExchangeClient.approveAgent({
                    agentAddress,
                    agentName: DEFAULT_AGENT_NAME,
                  });

                  // Verify approval
                  const isNowApproved = await checkAgentApproval(masterAddress, agentAddress);

                  if (!isNowApproved) {
                    Alert.alert('Approval Failed', 'Agent approval was not confirmed.');
                    resolve(undefined);
                    return;
                  }

                  resolve(agentExchangeClient);
                } catch (error) {
                  console.error('Failed to approve agent:', error);
                  Alert.alert(
                    'Approval Failed',
                    error instanceof Error ? error.message : 'An error occurred',
                  );
                  resolve(undefined);
                }
              },
            },
          ],
        );
      });
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize agent');
      return undefined;
    }
  }, [walletProvider, transport, checkAgentApproval]);

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      infoClient,
    }),
    [getAgentExchangeClient, getMasterExchangeClient, infoClient],
  );
}
