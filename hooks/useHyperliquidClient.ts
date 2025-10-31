import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useCallback, useMemo, useRef } from 'react';
import { Alert } from 'react-native';

import { DEFAULT_AGENT_NAME, getOrCreateAgentSigner } from '@/lib/hyperliquid/agent';
import { useActiveWallet } from './useActiveWallet';

// Singleton instances - shared across all hook usages
let transport: hl.HttpTransport | undefined;
let infoClient: hl.InfoClient | undefined;
let wsTransport: hl.WebSocketTransport | undefined;
let subscriptionClient: hl.SubscriptionClient | undefined;
let symbolConverter: SymbolConverter | undefined;

function getTransport(): hl.HttpTransport {
  if (!transport) {
    transport = new hl.HttpTransport();
  }
  return transport;
}

function getInfoClient(): hl.InfoClient {
  if (!infoClient) {
    infoClient = new hl.InfoClient({ transport: getTransport() });
  }
  return infoClient;
}

function getSubscriptionClient(): hl.SubscriptionClient {
  if (!subscriptionClient || !wsTransport) {
    wsTransport = new hl.WebSocketTransport();
    subscriptionClient = new hl.SubscriptionClient({ transport: wsTransport });
  }
  return subscriptionClient;
}

async function getSymbolConverter(): Promise<SymbolConverter> {
  if (!symbolConverter) {
    symbolConverter = await SymbolConverter.create({ transport: getTransport() });
  }
  return symbolConverter;
}

interface UseHyperliquidClientResult {
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
  getInfoClient: () => hl.InfoClient;
  getSubscriptionClient: () => hl.SubscriptionClient;
  getSymbolConverter: () => Promise<SymbolConverter>;
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getProvider, address: walletAddress } = useActiveWallet();

  // Store singleton function references to prevent unnecessary re-renders
  // These functions don't depend on any state and should have stable references
  const getInfoClientRef = useRef(getInfoClient);
  const getSubscriptionClientRef = useRef(getSubscriptionClient);
  const getSymbolConverterRef = useRef(getSymbolConverter);

  // Helper function to check if agent is approved
  const checkAgentApproval = useCallback(
    async (masterAddress: string, agentAddress: string): Promise<boolean> => {
      const client = getInfoClient();
      const existingAgents = await client.extraAgents({ user: masterAddress });
      return existingAgents.some(
        agent => agent.address.toLowerCase() === agentAddress.toLowerCase(),
      );
    },
    [],
  );

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

  // Get agent exchange client with approval flow
  const getAgentExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    if (!walletAddress) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
      return undefined;
    }

    try {
      // Setup master wallet
      const ethersProvider = await getProvider();
      if (!ethersProvider) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
        return undefined;
      }

      const masterSigner = await ethersProvider.getSigner();
      const masterAddress = (await masterSigner.getAddress()).toLowerCase();

      // Setup agent wallet
      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const agentAddress = await agentSigner.getAddress();

      // Create agent exchange client
      const agentExchangeClient = new hl.ExchangeClient({
        wallet: agentSigner,
        transport: getTransport(),
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
                    transport: getTransport(),
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
  }, [walletAddress, getProvider, checkAgentApproval]);

  return useMemo(
    () => ({
      getAgentExchangeClient,
      getMasterExchangeClient,
      // Use refs for singleton functions to maintain stable references
      getInfoClient: getInfoClientRef.current,
      getSubscriptionClient: getSubscriptionClientRef.current,
      getSymbolConverter: getSymbolConverterRef.current,
    }),
    [getAgentExchangeClient, getMasterExchangeClient],
  );
}
