import { getWalletAddress } from '@nktkas/hyperliquid/signing';
import { useCallback, useState } from 'react';
import { Alert } from 'react-native';

import { useHyperliquidClient } from '@/lib/hyperliquid/hooks/useHyperliquidClient';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

import { DEFAULT_AGENT_NAME } from '../constants';
import {
  approveAgentOnChain,
  getAgentsFromChain,
  getOrCreateAgentSigner,
  revokeAgentOnChain,
  verifyAgentApproval,
} from '../service';
import { clearAgentPrivateKey } from '../storage';
import { type AgentInfo } from '../types';

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
      const approved = await verifyAgentApproval(infoClient, masterAddress, agentAddr);

      console.log('checkStatus debug:', {
        localAgentAddress: agentAddr,
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

      const agents = await getAgentsFromChain(infoClient, masterAddress);
      setAllAgents(agents);
      return agents;
    } catch (error) {
      console.error('Failed to get all agents:', error);
      return [];
    }
  }, [getMasterExchangeClient, getInfoClient]);

  /**
   * Revoke a named agent from blockchain using 0x0 address
   * @param agentName - The name of the agent to revoke
   * @returns Promise that resolves to true if successful
   */
  const revoke = useCallback(
    async (agentName: string): Promise<boolean> => {
      const isRiverrunAgent = agentName === DEFAULT_AGENT_NAME;

      return new Promise<boolean>(resolve => {
        Alert.alert(
          isRiverrunAgent ? 'Revoke Riverrun Agent' : 'Revoke Agent',
          isRiverrunAgent
            ? 'This will revoke the Riverrun Agent from the blockchain and clear local storage. You will need to approve a new agent for future trading.'
            : `This will revoke "${agentName}" from the blockchain. The agent will no longer be able to trade on your behalf. Continue?`,
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

                  // Revoke using service
                  await revokeAgentOnChain(masterExchangeClient, agentName);

                  // Clear local storage for Riverrun Agent
                  if (isRiverrunAgent) {
                    await clearAgentPrivateKey(masterAddress);
                  }

                  // Verify revoke
                  const agents = await getAgentsFromChain(infoClient, masterAddress);
                  const stillExists = agents.some(
                    agent => agent.name?.toLowerCase() === agentName.toLowerCase(),
                  );

                  if (stillExists) {
                    Alert.alert('Error', 'Agent revoke was not confirmed. Please try again.');
                    resolve(false);
                  } else {
                    // Update state if Riverrun Agent
                    if (isRiverrunAgent) {
                      setAgentAddress(undefined);
                      setIsApproved(false);
                    }

                    Alert.alert(
                      'Success',
                      isRiverrunAgent
                        ? 'Riverrun Agent revoked successfully'
                        : `"${agentName}" has been revoked successfully.`,
                    );

                    // Refresh status
                    if (isRiverrunAgent) {
                      await checkStatus();
                    }
                    await getAllAgents();
                    resolve(true);
                  }
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
    },
    [getMasterExchangeClient, getInfoClient, checkStatus, getAllAgents],
  );

  /**
   * Approve Riverrun Agent with confirmation dialog
   * Generates new agent and approves it on blockchain
   */
  const approve = useCallback(async (): Promise<boolean> => {
    try {
      setIsLoading(true);

      const masterExchangeClient = await getMasterExchangeClient();
      if (!masterExchangeClient) {
        Alert.alert('Error', 'Failed to get master wallet');
        return false;
      }

      const masterAddress = await getWalletAddress(masterExchangeClient.wallet);
      const ethersProvider = await getProvider();
      if (!ethersProvider) {
        Alert.alert('Error', 'Failed to get wallet provider');
        return false;
      }

      // Generate new agent
      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const agentAddr = await agentSigner.getAddress();

      // Approve agent on blockchain using service
      await approveAgentOnChain(masterExchangeClient, agentAddr, DEFAULT_AGENT_NAME);

      // Verify approval
      const infoClient = getInfoClient();
      const approved = await verifyAgentApproval(infoClient, masterAddress, agentAddr);

      if (approved) {
        setAgentAddress(agentAddr);
        setIsApproved(true);
        Alert.alert('Success', 'Riverrun Agent approved successfully');
        return true;
      } else {
        Alert.alert('Error', 'Agent approval was not confirmed. Please try again.');
        return false;
      }
    } catch (error) {
      console.error('Failed to approve agent:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to approve agent');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getMasterExchangeClient, getProvider, getInfoClient]);

  return {
    agentAddress,
    isApproved,
    isLoading,
    allAgents,
    checkStatus,
    approve,
    revoke,
    getAllAgents,
  };
}
