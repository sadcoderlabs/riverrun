import { useCallback, useState } from 'react';
import { useStore } from 'zustand';
import * as hl from '@nktkas/hyperliquid';

import { useAgentComposition } from './agentComposition';
import { agentStateStore } from '../adapters/agentStateStore';
import { getAgentExchangeClient as getAgentExchangeClientGetter } from '@/lib/hyperliquid/client/getter';
import type { AgentApprovalStatus, AgentInfo } from '../ports/types';

export interface UseAgentContextResult {
  /**
   * Current agent address (undefined if not created yet)
   */
  agentAddress: string | undefined;

  /**
   * Whether the agent is approved on blockchain
   */
  isApproved: boolean;

  /**
   * Loading state for agent operations
   */
  isLoading: boolean;

  /**
   * All agents for the current user
   */
  allAgents: AgentInfo[];

  /**
   * Check approval status for the current agent
   * Updates the store with the result
   */
  checkStatus: () => Promise<AgentApprovalStatus>;

  /**
   * Approve the Riverrun Agent on blockchain
   * Throws error if approval fails
   */
  approve: () => Promise<boolean>;

  /**
   * Revoke a named agent from blockchain
   * @param agentName - Name of the agent to revoke
   * Throws error if revocation fails
   */
  revoke: (agentName: string) => Promise<boolean>;

  /**
   * Get agent exchange client
   * Returns undefined if agent is not ready or user cancels
   *
   * Note: This method does NOT show approval dialogs or handle navigation.
   * UI components should call checkStatus(), approve() explicitly and handle alerts.
   */
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
}

/**
 * useAgentContext - Agent management hook
 *
 * This is the main hook for agent operations. It provides:
 * - Reactive access to agent state (address, approval status, loading)
 * - All agent operations (approve, revoke, check status)
 * - Access to agent exchange client
 *
 * The hook automatically tracks agent state changes and provides
 * stable callback references for all operations.
 *
 * @example
 * ```tsx
 * const { agentAddress, isApproved, approve, checkStatus } = useAgentContext();
 *
 * useEffect(() => {
 *   checkStatus();
 * }, [checkStatus]);
 *
 * // Check if agent is approved
 * if (!isApproved) {
 *   return (
 *     <Button onPress={async () => {
 *       try {
 *         await approve();
 *         Alert.alert('Success', 'Agent approved!');
 *       } catch (error) {
 *         Alert.alert('Error', error.message);
 *       }
 *     }}>
 *       Approve Agent
 *     </Button>
 *   );
 * }
 * ```
 */
export function useAgentContext(): UseAgentContextResult {
  const { agentService } = useAgentComposition();

  // UI state management (presentation layer)
  const [isLoading, setIsLoading] = useState(false);

  // Subscribe to agentStateStore for reactive updates (business data)
  const agentAddress = useStore(agentStateStore, state => state.agentAddress);
  const isApproved = useStore(agentStateStore, state => state.isApproved);
  const allAgents = useStore(agentStateStore, state => state.allAgents);

  // Wrap agentService methods with loading management
  const checkStatus = useCallback(async () => {
    setIsLoading(true);
    try {
      return await agentService.checkApprovalStatus();
    } finally {
      setIsLoading(false);
    }
  }, [agentService]);

  const approve = useCallback(async () => {
    setIsLoading(true);
    try {
      return await agentService.approveAgent();
    } finally {
      setIsLoading(false);
    }
  }, [agentService]);

  const revoke = useCallback(
    async (agentName: string) => {
      setIsLoading(true);
      try {
        return await agentService.revokeAgent(agentName);
      } finally {
        setIsLoading(false);
      }
    },
    [agentService],
  );

  /**
   * Get agent exchange client
   *
   * This method gets the agent wallet and creates an ExchangeClient for it.
   * It does NOT handle approval logic or show dialogs - that should be done
   * by the calling component.
   */
  const getAgentExchangeClient = useCallback(async (): Promise<hl.ExchangeClient | undefined> => {
    try {
      // Get agent wallet
      const agentWallet = await agentService.getOrCreateAgentWallet();

      // Return exchange client
      return getAgentExchangeClientGetter(agentWallet.signer);
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      return undefined;
    }
  }, [agentService]);

  return {
    agentAddress,
    isApproved,
    isLoading,
    allAgents,
    checkStatus,
    approve,
    revoke,
    getAgentExchangeClient,
  };
}
