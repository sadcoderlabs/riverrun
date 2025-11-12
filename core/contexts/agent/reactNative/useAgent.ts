import { useCallback, useState } from 'react';
import * as hl from '@nktkas/hyperliquid';

import { useAgentComposition } from './agentComposition';
import { getAgentExchangeClient as getAgentExchangeClientGetter } from '@/lib/hyperliquid/client/getter';
import type { AgentApprovalStatus } from '../ports/types';

export interface UseAgentResult {
  /**
   * Loading state for agent operations (UI state only)
   */
  isLoading: boolean;

  /**
   * Load agent approval status from blockchain
   *
   * Updates the agentStateStore with the current approval status.
   * This method must be called manually to initialize or refresh agent state.
   *
   * @returns Promise resolving to the current agent approval status
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   loadStatus();
   * }, [loadStatus]);
   * ```
   */
  loadStatus: () => Promise<AgentApprovalStatus>;

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
 * useAgent - Agent business operations hook
 *
 * This hook provides agent-related business operations.
 * For state access, use useAgentStore instead for better performance.
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadStatus() to initialize.
 *
 * Provides:
 * - Agent operations (approve, revoke, load status)
 * - Access to agent exchange client
 * - UI loading state
 *
 * @example
 * ```tsx
 * import { useAgentStore, useAgent } from '@/core/composition';
 *
 * // State access - precise subscriptions
 * const agentAddress = useAgentStore(state => state.agentAddress);
 * const isApproved = useAgentStore(state => state.isApproved);
 *
 * // Business operations
 * const { approve, loadStatus, isLoading } = useAgent();
 *
 * // Load data on mount
 * useEffect(() => {
 *   loadStatus();
 * }, [loadStatus]);
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
  const loadStatus = useCallback(async () => {
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
    isLoading,
    loadStatus,
    approve,
    revoke,
    getAgentExchangeClient,
  };
}
