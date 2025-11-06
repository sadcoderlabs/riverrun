import { getWalletAddress } from '@nktkas/hyperliquid/signing';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import {
  clearAgentSigner,
  DEFAULT_AGENT_NAME,
  getOrCreateAgentSigner,
} from '@/lib/hyperliquid/agent';
import { useHyperliquidClient } from '@/lib/hyperliquid/hooks/useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

/**
 * Agent information from Hyperliquid
 */
export interface AgentInfo {
  address: string;
  name: string | undefined;
}

/**
 * Hook for managing agent approval status
 * Provides functions to check, approve, and revoke agent
 */
export function useAgentApproval() {
  const { getMasterExchangeClient, getInfoClient } = useHyperliquidClient();
  const { getProvider } = useActiveWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | undefined>(undefined);
  const [isApproved, setIsApproved] = useState(false);
  const [allAgents, setAllAgents] = useState<AgentInfo[]>([]);

  /**
   * Check if agent is approved for the current user
   * @returns Object containing agent address and approval status
   */
  const checkStatus = useCallback(async () => {
    try {
      setIsLoading(true);

      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        return { agentAddress: undefined, isApproved: false };
      }

      const masterAddress = await getWalletAddress(masterExchangeClient.wallet);
      const infoClient = getInfoClient();

      // Get provider from useActiveWallet
      const ethersProvider = await getProvider();
      if (!ethersProvider) {
        return { agentAddress: undefined, isApproved: false };
      }

      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const agentAddr = await agentSigner.getAddress();

      // Check if agent is approved
      const existingAgents = await infoClient.extraAgents({ user: masterAddress });
      const approved = existingAgents.some(
        agent => agent.address.toLowerCase() === agentAddr.toLowerCase(),
      );

      console.log('checkStatus debug:', {
        localAgentAddress: agentAddr,
        existingAgents: existingAgents.map(a => ({ address: a.address, name: a.name })),
        approved,
      });

      setAgentAddress(agentAddr);
      setIsApproved(approved);

      return { agentAddress: agentAddr, isApproved: approved };
    } catch (error) {
      console.error('Failed to check agent approval status:', error);
      setAgentAddress(undefined);
      setIsApproved(false);
      return { agentAddress: undefined, isApproved: false };
    } finally {
      setIsLoading(false);
    }
  }, [getMasterExchangeClient, getInfoClient, getProvider]);

  /**
   * Get all agents for the current user
   * @returns Array of agent information
   */
  const getAllAgents = useCallback(async (): Promise<AgentInfo[]> => {
    try {
      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        return [];
      }

      const masterAddress = await getWalletAddress(masterExchangeClient.wallet);
      const infoClient = getInfoClient();

      const agents = await infoClient.extraAgents({ user: masterAddress });
      const agentInfos = agents.map(agent => ({
        address: agent.address,
        name: agent.name,
      }));

      setAllAgents(agentInfos);
      return agentInfos;
    } catch (error) {
      console.error('Failed to get all agents:', error);
      return [];
    }
  }, [getMasterExchangeClient, getInfoClient]);

  /**
   * Revoke a specific named agent from blockchain using 0x0 address
   * @param agentName - The name of the agent to revoke
   * @returns Promise that resolves to true if successful
   */
  const revokeNamedAgent = useCallback(
    async (agentName: string): Promise<boolean> => {
      return new Promise<boolean>(resolve => {
        Alert.alert(
          'Revoke Agent',
          `This will revoke "${agentName}" from the blockchain. The agent will no longer be able to trade on your behalf. Continue?`,
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => resolve(false),
            },
            {
              text: 'Revoke',
              style: 'destructive',
              onPress: async () => {
                try {
                  setIsLoading(true);

                  const masterExchangeClient = await getMasterExchangeClient();
                  if (!masterExchangeClient) {
                    Alert.alert('Error', 'Failed to get master wallet');
                    resolve(false);
                    return;
                  }

                  const masterAddress = await getWalletAddress(masterExchangeClient.wallet);
                  const infoClient = getInfoClient();

                  // Revoke using 0x0 address
                  await masterExchangeClient.approveAgent({
                    agentAddress: '0x0000000000000000000000000000000000000000',
                    agentName: agentName,
                  });

                  // Wait for blockchain state to propagate
                  await new Promise(resolve => setTimeout(resolve, 2000));

                  // Verify revoke
                  const agents = await infoClient.extraAgents({ user: masterAddress });
                  const stillExists = agents.some(
                    agent => agent.name?.toLowerCase() === agentName.toLowerCase(),
                  );

                  if (stillExists) {
                    Alert.alert('Error', 'Agent revoke was not confirmed. Please try again.');
                    resolve(false);
                  } else {
                    Alert.alert('Success', `"${agentName}" has been revoked successfully.`);
                    // Refresh status
                    await checkStatus();
                    await getAllAgents();
                    resolve(true);
                  }
                } catch (error) {
                  console.error('Failed to revoke named agent:', error);
                  Alert.alert(
                    'Error',
                    error instanceof Error ? error.message : 'Failed to revoke agent',
                  );
                  resolve(false);
                } finally {
                  setIsLoading(false);
                }
              },
            },
          ],
        );
      });
    },
    [getMasterExchangeClient, getInfoClient, checkStatus, getAllAgents],
  );

  /**
   * Revoke Riverrun Agent from blockchain and clear local storage
   * Shows confirmation dialog before revoking
   */
  const revoke = useCallback(async (): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      Alert.alert(
        'Revoke Riverrun Agent',
        'This will revoke the Riverrun Agent from the blockchain and clear local storage. You will need to approve a new agent for future trading.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              try {
                setIsLoading(true);

                const masterExchangeClient = await getMasterExchangeClient();
                if (!masterExchangeClient) {
                  Alert.alert('Error', 'Failed to get master wallet');
                  resolve(false);
                  return;
                }

                const masterAddress = await getWalletAddress(masterExchangeClient.wallet);

                // Revoke from blockchain using 0x0 address
                await masterExchangeClient.approveAgent({
                  agentAddress: '0x0000000000000000000000000000000000000000',
                  agentName: DEFAULT_AGENT_NAME,
                });

                // Wait for blockchain state to propagate
                await new Promise(resolve => setTimeout(resolve, 2000));

                // Clear agent signer from local storage
                await clearAgentSigner(masterAddress);

                // Update state
                setAgentAddress(undefined);
                setIsApproved(false);

                Alert.alert('Success', 'Riverrun Agent revoked successfully');
                await getAllAgents();
                resolve(true);
              } catch (error) {
                console.error('Failed to revoke agent:', error);
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to revoke agent',
                );
                resolve(false);
              } finally {
                setIsLoading(false);
              }
            },
          },
        ],
      );
    });
  }, [getMasterExchangeClient, getAllAgents]);

  return {
    agentAddress,
    isApproved,
    isLoading,
    allAgents,
    checkStatus,
    revoke,
    getAllAgents,
    revokeNamedAgent,
  };
}
