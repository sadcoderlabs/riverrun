import * as hl from '@nktkas/hyperliquid';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import {
  getInfoClient,
  getMasterExchangeClient,
  getAgentExchangeClient as getCachedAgentExchangeClient,
} from '@/lib/hyperliquid/client/getter';
import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';

import { DEFAULT_AGENT_NAME } from '../constants';
import { getOrCreateAgentSigner } from '../getOrCreateAgentSigner';
import {
  approveAgentOnChain,
  getAgentsFromChain,
  verifyAgentApproval,
  type AgentInfo,
} from '../agentBlockchain';
import { hasAgentPrivateKey } from '../agentPkStore';

/**
 * Count named agents on blockchain
 */
async function countNamedAgents(infoClient: hl.InfoClient, masterAddress: string): Promise<number> {
  try {
    const agents = await getAgentsFromChain(infoClient, masterAddress);
    return agents.filter(agent => agent.name).length;
  } catch (error) {
    console.error('Failed to count named agents:', error);
    return 0;
  }
}

/**
 * Find agent by name from agents array
 */
function findAgentByName(agents: AgentInfo[], agentName: string): AgentInfo | undefined {
  return agents.find(agent => agent.name?.toLowerCase() === agentName.toLowerCase());
}

/**
 * Approve agent with confirmation dialog
 * Shows a unified message for all agent approval scenarios
 */
async function approveAgent(
  masterSigner: any,
  agentAddress: string,
  masterAddress: string,
): Promise<boolean> {
  return new Promise<boolean>(resolve => {
    Alert.alert(
      'Approve Riverrun Agent',
      'This will approve the Riverrun Agent to place orders on your behalf.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              // Get cached master exchange client for approval
              const masterExchangeClient = getMasterExchangeClient(masterAddress, masterSigner);

              // Approve the agent using service
              await approveAgentOnChain(masterExchangeClient, agentAddress, DEFAULT_AGENT_NAME);

              // Verify approval using service
              const infoClient = getInfoClient();
              const isApproved = await verifyAgentApproval(infoClient, masterAddress, agentAddress);

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
      ],
    );
  });
}

/**
 * Hook for getting an agent exchange client
 * Handles agent creation, approval, and validation
 */
export function useAgentExchangeClient() {
  const { wallet } = useActiveWallet();
  const router = useRouter();

  /**
   * Get agent exchange client with simplified approval flow
   * @returns Promise resolving to ExchangeClient or undefined
   */
  const getAgentExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    if (!wallet) {
      Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
      return undefined;
    }

    try {
      // Setup master wallet
      const ethersProvider = await wallet.getProvider();
      if (!ethersProvider) {
        Alert.alert('Wallet Not Connected', 'Please connect your wallet to continue.');
        return undefined;
      }

      const masterSigner = await ethersProvider.getSigner();
      const masterAddress = (await masterSigner.getAddress()).toLowerCase();

      // Get or create agent signer (used in all paths)
      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const agentAddress = await agentSigner.getAddress();

      // Check local storage first
      const hasLocal = await hasAgentPrivateKey(masterAddress);

      // Determine if we need approval
      let needsApproval = false;

      if (!hasLocal) {
        // No local agent - check if we can approve
        const namedCount = await countNamedAgents(getInfoClient(), masterAddress);

        if (namedCount >= 3) {
          // At agent limit - redirect to Settings
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
                    router.push('/settings/agent-status');
                    resolve(undefined);
                  },
                },
              ],
            );
          });
        }

        needsApproval = true;
      } else {
        // Has local agent - validate it
        const agents = await getAgentsFromChain(getInfoClient(), masterAddress);
        const riverrunAgent = findAgentByName(agents, DEFAULT_AGENT_NAME);

        // Need approval if agent doesn't exist on blockchain or addresses don't match
        needsApproval =
          !riverrunAgent || riverrunAgent.address.toLowerCase() !== agentAddress.toLowerCase();
      }

      // Request approval if needed
      if (needsApproval) {
        const approved = await approveAgent(masterSigner, agentAddress, masterAddress);
        if (!approved) {
          return undefined;
        }
      }

      // Return cached exchange client with agent signer
      return getCachedAgentExchangeClient(agentAddress, agentSigner);
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize agent');
      return undefined;
    }
  }, [wallet, router]);

  return { getAgentExchangeClient };
}
