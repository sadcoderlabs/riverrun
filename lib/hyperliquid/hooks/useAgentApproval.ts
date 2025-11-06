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
   * Approve agent for trading
   * Shows confirmation dialog before approving
   */
  const approve = useCallback(async (): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      Alert.alert(
        'Approve Agent',
        'This will approve the agent wallet to place orders on your behalf. You will be redirected to your wallet app to sign the approval.',
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
                setIsLoading(true);

                const masterExchangeClient = await getMasterExchangeClient();
                if (!masterExchangeClient) {
                  Alert.alert('Error', 'Failed to get master wallet');
                  resolve(false);
                  return;
                }

                const masterAddress = await getWalletAddress(masterExchangeClient.wallet);
                const ethersProvider = await getProvider();
                if (!ethersProvider) {
                  Alert.alert('Error', 'Failed to get wallet provider');
                  resolve(false);
                  return;
                }

                // Get agent address
                const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
                const agentAddr = await agentSigner.getAddress();

                // Approve agent
                await masterExchangeClient.approveAgent({
                  agentAddress: agentAddr,
                  agentName: DEFAULT_AGENT_NAME,
                });

                // Verify approval
                const status = await checkStatus();
                if (status.isApproved) {
                  Alert.alert('Success', 'Agent approved successfully');
                  resolve(true);
                } else {
                  Alert.alert('Error', 'Agent approval was not confirmed');
                  resolve(false);
                }
              } catch (error) {
                console.error('Failed to approve agent:', error);
                Alert.alert(
                  'Error',
                  error instanceof Error ? error.message : 'Failed to approve agent',
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
  }, [getMasterExchangeClient, checkStatus, getProvider]);

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

  /**
   * Ensure Riverrun Agent is approved (for use in Settings page)
   * Handles complex scenarios like checking existing agents and limits
   * @returns Promise that resolves to true if Riverrun Agent is approved
   */
  const ensureRiverrunAgent = useCallback(async (): Promise<boolean> => {
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

      const agentSigner = await getOrCreateAgentSigner(masterAddress, ethersProvider);
      const localAgentAddress = await agentSigner.getAddress();

      // Get all current agents
      const agents = await getAllAgents();
      const riverrunAgent = agents.find(a => a.name === DEFAULT_AGENT_NAME);
      const namedAgentsCount = agents.filter(a => a.name).length;

      // Check if Riverrun Agent already exists
      if (riverrunAgent) {
        if (riverrunAgent.address.toLowerCase() === localAgentAddress.toLowerCase()) {
          // Already approved with correct address
          Alert.alert('Already Approved', 'Riverrun Agent is already approved.');
          setIsApproved(true);
          setAgentAddress(localAgentAddress);
          return true;
        } else {
          // Exists but with different address - need to overwrite
          // This will be handled by the approve() function (same name overwrites)
          return await approve();
        }
      }

      // Riverrun Agent doesn't exist - check if we can create it
      if (namedAgentsCount >= 3) {
        Alert.alert(
          'Agent Limit Reached',
          'You have reached the limit of 3 named agents. Please revoke one of the existing agents first before approving Riverrun Agent.',
        );
        return false;
      }

      // Can approve directly
      return await approve();
    } catch (error) {
      console.error('Failed to ensure Riverrun Agent:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to check agent status');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [getMasterExchangeClient, getProvider, getAllAgents, approve]);

  /**
   * Renew Riverrun Agent - generates a new agent wallet and approves it
   * This will replace the existing Riverrun Agent with a new one
   * @returns Promise that resolves to true if successful
   */
  const renewRiverrunAgent = useCallback(async (): Promise<boolean> => {
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

      // Get all current agents to check if we can approve
      const agents = await getAllAgents();
      const namedAgentsCount = agents.filter(a => a.name).length;
      const riverrunAgent = agents.find(a => a.name === DEFAULT_AGENT_NAME);

      // If Riverrun Agent doesn't exist and we're at limit
      if (!riverrunAgent && namedAgentsCount >= 3) {
        Alert.alert(
          'Agent Limit Reached',
          'You have reached the limit of 3 named agents. Please revoke one of the existing agents first.',
        );
        return false;
      }

      // Generate a temporary new agent (don't save to storage yet)
      const { Wallet } = await import('ethers');
      const newWallet = Wallet.createRandom();
      const newAgentSigner = newWallet.connect(ethersProvider);
      const newAgentAddress = await newAgentSigner.getAddress();

      console.log('Generated new agent address:', newAgentAddress);

      // Approve the new agent (will overwrite if Riverrun Agent exists)
      await masterExchangeClient.approveAgent({
        agentAddress: newAgentAddress,
        agentName: DEFAULT_AGENT_NAME,
      });

      // Wait for blockchain to update
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Verify approval
      const infoClient = getInfoClient();
      const existingAgents = await infoClient.extraAgents({ user: masterAddress });
      const approved = existingAgents.some(
        agent => agent.address.toLowerCase() === newAgentAddress.toLowerCase(),
      );

      if (approved) {
        // Save the new agent to storage (this will overwrite the old one)
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        const storageKey = `hl-agent:private-key:${masterAddress.toLowerCase()}`;
        await AsyncStorage.default.setItem(storageKey, newWallet.privateKey);

        console.log('New agent saved to storage:', newAgentAddress);

        // Update state
        setAgentAddress(newAgentAddress);
        setIsApproved(true);

        Alert.alert('Success', 'Riverrun Agent approved successfully.');
        await getAllAgents();
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
  }, [getMasterExchangeClient, getProvider, getInfoClient, getAllAgents]);

  return {
    agentAddress,
    isApproved,
    isLoading,
    allAgents,
    checkStatus,
    approve,
    revoke,
    getAllAgents,
    revokeNamedAgent,
    ensureRiverrunAgent,
    renewRiverrunAgent,
  };
}
