import * as hl from '@nktkas/hyperliquid';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { getInfoClient, getTransport } from '@/lib/hyperliquid/client';
import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';

import { DEFAULT_AGENT_NAME } from '../constants';
import {
  approveAgentOnChain,
  countNamedAgents,
  getOrCreateAgentSigner,
  hasLocalAgent,
  validateLocalAgent,
  verifyAgentApproval,
} from '../service';

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
    ]);
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
      const hasLocal = await hasLocalAgent(masterAddress);

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

  return { getAgentExchangeClient };
}
