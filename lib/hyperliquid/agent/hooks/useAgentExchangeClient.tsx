import * as hl from '@nktkas/hyperliquid';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { getInfoClient, getTransport } from '@/lib/hyperliquid/client';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

import { AGENT_APPROVAL_WAIT_TIME, DEFAULT_AGENT_NAME } from '../constants';
import {
  approveAgentOnChain,
  getAgentsFromChain,
  getOrCreateAgentSigner,
  verifyAgentApproval,
} from '../service';
import { hasAgentPrivateKey } from '../storage';
import { type AgentInfo, type ValidationResult } from '../types';

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
 * Validate local agent against blockchain
 */
async function validateLocalAgent(
  masterAddress: string,
  ethersProvider: any,
  infoClient: hl.InfoClient,
): Promise<ValidationResult> {
  try {
    // Get local agent signer to get address
    const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
    const localAddress = await agentSigner.getAddress();

    // Get blockchain agents
    const agents = await getAgentsFromChain(infoClient, masterAddress);
    const riverrunAgent = findAgentByName(agents, DEFAULT_AGENT_NAME);

    if (!riverrunAgent) {
      // Riverrun Agent doesn't exist on blockchain, but we have local key
      return { isValid: false, localAddress };
    }

    // Check if addresses match
    const isValid = riverrunAgent.address.toLowerCase() === localAddress.toLowerCase();

    return {
      isValid,
      localAddress,
      blockchainAddress: riverrunAgent.address,
    };
  } catch (error) {
    console.error('Failed to validate local agent:', error);
    return { isValid: false };
  }
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
              // Create master exchange client for approval
              const masterExchangeClient = new hl.ExchangeClient({
                wallet: masterSigner,
                transport: getTransport(),
              });

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
  const { getProvider, address: walletAddress } = useActiveWallet();
  const router = useRouter();

  /**
   * Get agent exchange client with simplified approval flow
   * @returns Promise resolving to ExchangeClient or undefined
   */
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
      const hasLocal = await hasAgentPrivateKey(masterAddress);

      if (!hasLocal) {
        // No local agent - need to create and approve
        // Check if we're at the 3-agent limit
        const namedCount = await countNamedAgents(getInfoClient(), masterAddress);

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
                    router.push('/settings/agent-status');
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

        const approved = await approveAgent(masterSigner, agentAddress, masterAddress);

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

      const approved = await approveAgent(masterSigner, agentAddress, masterAddress);

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

  return { getAgentExchangeClient };
}
