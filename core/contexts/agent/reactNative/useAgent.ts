import { useCallback, useState } from 'react';
import * as hl from '@nktkas/hyperliquid';

import { useAgentComposition } from './agentComposition';
import { getAgentExchangeClient as getAgentExchangeClientGetter } from '@/core/infra/hyperliquid/client/getter';

export interface UseAgentResult {
  /**
   * Loading state for agent operations (UI state only)
   */
  isLoading: boolean;

  /**
   * Load all agents from blockchain
   *
   * Updates the agentStateStore with agentAddress and allAgents.
   * This method must be called manually to initialize or refresh agent state.
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   loadAllAgents();
   * }, [loadAllAgents]);
   * ```
   */
  loadAllAgents: () => Promise<void>;

  /**
   * Approve the Riverrun Agent on blockchain
   *
   * This calls tryGetAgentWallet internally to create and approve a new agent.
   * Throws error if approval fails or user cancels.
   */
  approve: () => Promise<void>;

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
   * UI components should call loadAllAgents(), approve() explicitly and handle alerts.
   */
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | undefined>;
}

/**
 * useAgent - Agent business operations hook
 *
 * This hook provides agent-related business operations.
 * For state access, use useAgentStore instead for better performance.
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadAllAgents() to initialize.
 *
 * Provides:
 * - Agent operations (approve, revoke, load all agents)
 * - Access to agent exchange client
 * - UI loading state
 *
 * @example
 * ```tsx
 * import { useAgentStore, useAgent } from '@/core/composition';
 *
 * // State access - precise subscriptions
 * const agentAddress = useAgentStore(state => state.agentAddress);
 * const allAgents = useAgentStore(state => state.allAgents);
 *
 * // Calculate isApproved from state
 * const isApproved = allAgents.some(
 *   a => a.address.toLowerCase() === agentAddress?.toLowerCase()
 * );
 *
 * // Business operations
 * const { approve, loadAllAgents, isLoading } = useAgent();
 *
 * // Load data on mount
 * useEffect(() => {
 *   loadAllAgents();
 * }, [loadAllAgents]);
 *
 * if (!isApproved) {
 *   return (
 *     <Button onPress={approve} loading={isLoading}>
 *       Approve Agent
 *     </Button>
 *   );
 * }
 * ```
 */
export function useAgent(): UseAgentResult {
  const { agentService } = useAgentComposition();

  // UI state management (presentation layer only)
  const [isLoading, setIsLoading] = useState(false);

  // Wrap agentService methods with loading management
  const loadAllAgents = useCallback(async () => {
    setIsLoading(true);
    try {
      await agentService.loadAllAgents();
    } finally {
      setIsLoading(false);
    }
  }, [agentService]);

  const approve = useCallback(async () => {
    setIsLoading(true);
    try {
      // Call tryGetAgentWallet to create and approve new agent
      // We don't use the returned wallet, just trigger the approval flow
      const result = await agentService.tryGetAgentWallet();
      if (result.errorReason) {
        throw new Error(result.errorReason);
      }
    } finally {
      setIsLoading(false);
    }
  }, [agentService]);

  const revoke = useCallback(
    async (agentName: string) => {
      setIsLoading(true);
      try {
        return await agentService.revoke(agentName);
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
      const { agentWallet } = await agentService.tryGetAgentWallet();
      if (!agentWallet) {
        return undefined;
      }

      // Return exchange client
      return getAgentExchangeClientGetter(agentWallet.signer);
    } catch (error) {
      console.error('Failed to get agent exchange client:', error);
      return undefined;
    }
  }, [agentService]);

  return {
    isLoading,
    loadAllAgents,
    approve,
    revoke,
    getAgentExchangeClient,
  };
}
