import * as hl from '@nktkas/hyperliquid';
import { SymbolConverter } from '@nktkas/hyperliquid/utils';
import { useRouter } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert } from 'react-native';

import { DEFAULT_AGENT_NAME, getOrCreateAgentSigner } from '@/lib/hyperliquid/agent';
import {
  countNamedAgents,
  hasLocalAgent,
  validateLocalAgent,
} from '@/lib/hyperliquid/utils/agent-validation';
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

/**
 * Approve agent with confirmation dialog
 */
async function approveAgent(
  masterSigner: any,
  agentAddress: string,
  masterAddress: string,
  title: string,
  message: string,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    Alert.alert(title, message, [
      {
        text: 'Cancel',
        style: 'cancel',
        onPress: () => resolve(false),
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

            // Wait for blockchain propagation
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Verify approval
            const infoClient = getInfoClient();
            const existingAgents = await infoClient.extraAgents({ user: masterAddress });
            const isApproved = existingAgents.some(
              agent => agent.address.toLowerCase() === agentAddress.toLowerCase(),
            );

            if (!isApproved) {
              Alert.alert(
                'Verification Failed',
                'Agent approval was not confirmed. Please try again or check Settings.',
              );
              resolve(false);
              return;
            }

            resolve(true);
          } catch (error) {
            console.error('Failed to approve agent:', error);
            Alert.alert(
              'Approval Failed',
              error instanceof Error ? error.message : 'An error occurred',
            );
            resolve(false);
          }
        },
      },
    ]);
  });
}

export function useHyperliquidClient(): UseHyperliquidClientResult {
  const { getProvider, address: walletAddress } = useActiveWallet();
  const router = useRouter();

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

      // Check local storage first (user preference)
      const hasLocal = await hasLocalAgent(masterAddress);

      if (!hasLocal) {
        // No local agent - need to create and approve
        // Check if we're at the 3-agent limit
        const namedCount = await countNamedAgents(masterAddress, getInfoClient());

        if (namedCount >= 3) {
          // Redirect to Settings
          return new Promise<hl.ExchangeClient | undefined>(resolve => {
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

        // Can approve - generate new agent
        const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
        const agentAddress = await agentSigner.getAddress();

        const approved = await approveAgent(
          masterSigner,
          agentAddress,
          masterAddress,
          'Approve Agent',
          'This will approve the Riverrun Agent to place orders on your behalf.',
        );

        if (!approved) {
          return undefined;
        }

        return new hl.ExchangeClient({
          wallet: agentSigner,
          transport: getTransport(),
        });
      }

      // Has local agent - validate it
      const validation = await validateLocalAgent(masterAddress, ethersProvider, getInfoClient());

      if (validation.isValid) {
        // Valid agent - use it directly
        const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
        return new hl.ExchangeClient({
          wallet: agentSigner,
          transport: getTransport(),
        });
      }

      // Invalid agent (mismatch or doesn't exist on blockchain)
      // Treat as invalid and prompt approval (overwrites blockchain)
      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const agentAddress = await agentSigner.getAddress();

      const approved = await approveAgent(
        masterSigner,
        agentAddress,
        masterAddress,
        validation.blockchainAddress ? 'Overwrite Riverrun Agent' : 'Approve Riverrun Agent',
        validation.blockchainAddress
          ? 'The Riverrun Agent exists with a different address. This will update it to work with this device.'
          : 'The Riverrun Agent is not approved on the blockchain. This will approve it.',
      );

      if (!approved) {
        return undefined;
      }

      return new hl.ExchangeClient({
        wallet: agentSigner,
        transport: getTransport(),
      });
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize agent');
      return undefined;
    }
  }, [walletAddress, getProvider, router]);

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
