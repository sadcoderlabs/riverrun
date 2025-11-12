/**
 * useAgentExchangeClient hook
 * Provides agent exchange client with automatic approval flow
 *
 * This hook wraps the agent context and adds UI logic for approval dialogs and navigation.
 */

import * as hl from '@nktkas/hyperliquid';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

import { useAgent } from '@/core/composition';
import { DEFAULT_AGENT_NAME } from '@/core/contexts/agent/constants';

export function useAgentExchangeClient() {
  const { getAgentExchangeClient: getAgentClient, loadStatus, approve } = useAgent();
  const router = useRouter();

  /**
   * Get agent exchange client with approval flow
   * Handles agent validation, approval prompts, and agent limit checks
   */
  const getAgentExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    try {
      // Load current approval status
      const status = await loadStatus();

      // Check if agent exists in storage
      const hasLocal = status.agentAddress !== undefined;

      // Determine if we need approval
      let needsApproval = false;

      if (!hasLocal) {
        // No local agent - check if we can approve (agent limit)
        // Note: countNamedAgents is not directly exposed, but we can infer from status
        // For now, we'll just proceed and let the approval flow handle limit checks
        needsApproval = true;
      } else {
        // Has local agent - check if it's approved on blockchain
        needsApproval = !status.isApproved;
      }

      // If needs approval, show confirmation dialog
      if (needsApproval) {
        const approved = await new Promise<boolean>(resolve => {
          Alert.alert(
            `Approve ${DEFAULT_AGENT_NAME}`,
            `This will approve the ${DEFAULT_AGENT_NAME} to place orders on your behalf.`,
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
                    await approve();
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

        if (!approved) {
          return undefined;
        }
      }

      // Return agent exchange client
      return await getAgentClient();
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to initialize agent');
      return undefined;
    }
  }, [getAgentClient, loadStatus, approve, router]);

  return { getAgentExchangeClient };
}
