import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { DEFAULT_AGENT_NAME, getOrCreateAgentSigner } from '@/lib/hyperliquid/agent';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

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
  const router = useRouter();

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

  // Get agent exchange client with simplified approval flow
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
      const localAgentAddress = await agentSigner.getAddress();

      // Create agent exchange client
      const agentExchangeClient = new hl.ExchangeClient({
        wallet: agentSigner,
        transport: getTransport(),
      });

      // Get all current agents
      const infoClient = getInfoClient();
      const allAgents = await infoClient.extraAgents({ user: masterAddress });
      const riverrunAgent = allAgents.find(agent => agent.name === DEFAULT_AGENT_NAME);
      const namedAgentsCount = allAgents.filter(agent => agent.name).length;

      // Check if Riverrun Agent exists and matches local address
      if (riverrunAgent) {
        if (riverrunAgent.address.toLowerCase() === localAgentAddress.toLowerCase()) {
          // Agent is approved and matches - can use directly
          return agentExchangeClient;
        } else {
          // Riverrun Agent exists but with different address - need to overwrite
          // This is a simple case - one transaction to overwrite
          return await quickApproveAgent(
            masterSigner,
            localAgentAddress,
            agentExchangeClient,
            masterAddress,
            'Overwrite Riverrun Agent',
            'The Riverrun Agent exists with a different address. This will update it to work with this device.',
          );
        }
      }

      // Riverrun Agent doesn't exist - check if we have space
      if (namedAgentsCount >= 3) {
        // Complex case - need to revoke an agent first
        // Guide user to settings page
        return await new Promise<hl.ExchangeClient | undefined>(resolve => {
          Alert.alert(
            'Agent Limit Reached',
            'You have reached the limit of 3 named agents. Please manage your agents in Settings first.',
            [
              {
                text: 'Cancel',
                style: 'cancel',
                onPress: () => resolve(undefined),
              },
              {
                text: 'Go to Settings',
                onPress: () => {
                  router.push('/settings/approval-status');
                  resolve(undefined);
                },
              },
            ],
          );
        });
      }

      // Simple case - can approve directly (< 3 agents)
      return await quickApproveAgent(
        masterSigner,
        localAgentAddress,
        agentExchangeClient,
        masterAddress,
        'Approve Agent',
        'This will approve the Riverrun Agent to place orders on your behalf.',
      );
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize agent');
      return undefined;
    }

    /**
     * Quick approve agent - handles simple approval flow (one transaction)
     */
    async function quickApproveAgent(
      masterSigner: any,
      agentAddress: string,
      agentExchangeClient: hl.ExchangeClient,
      masterAddress: string,
      title: string,
      message: string,
    ): Promise<hl.ExchangeClient | undefined> {
      return await new Promise<hl.ExchangeClient | undefined>(resolve => {
        Alert.alert(title, message, [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(undefined),
          },
          {
            text: 'Approve',
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

                // Simple verification (wait 2 seconds then check once)
                await new Promise(resolve => setTimeout(resolve, 2000));
                const isNowApproved = await checkAgentApproval(masterAddress, agentAddress);

                if (!isNowApproved) {
                  Alert.alert(
                    'Verification Failed',
                    'Agent approval was not confirmed. Please try again or check Settings.',
                  );
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
        ]);
      });
    }
  }, [walletAddress, getProvider, checkAgentApproval, router]);

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
