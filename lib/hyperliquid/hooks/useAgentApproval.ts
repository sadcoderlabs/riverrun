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
 * Hook for managing agent approval status
 * Provides functions to check, approve, and revoke agent
 */
export function useAgentApproval() {
  const { getMasterExchangeClient, getInfoClient } = useHyperliquidClient();
  const { getProvider } = useActiveWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [agentAddress, setAgentAddress] = useState<string | undefined>(undefined);
  const [isApproved, setIsApproved] = useState(false);

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
   * Revoke agent by clearing the stored agent key
   * Shows confirmation dialog before revoking
   */
  const revoke = useCallback(async (): Promise<boolean> => {
    return new Promise<boolean>(resolve => {
      Alert.alert(
        'Revoke Agent',
        'This will remove the agent wallet from local storage. You will need to approve a new agent for future trading.',
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

                // Clear agent signer from storage
                await clearAgentSigner(masterAddress);

                // Update state
                setAgentAddress(undefined);
                setIsApproved(false);

                Alert.alert('Success', 'Agent revoked successfully');
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
  }, [getMasterExchangeClient]);

  return {
    agentAddress,
    isApproved,
    isLoading,
    checkStatus,
    approve,
    revoke,
  };
}
