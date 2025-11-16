/**
 * useAgent - Agent business operations hook
 *
 * This hook provides agent-related business operations using UseCases.
 * For state access, use useAgentStore instead for better performance.
 *
 * IMPORTANT: This hook does NOT auto-load data. Use useAgentAutoSync for auto-sync,
 * or call loadAllAgents() manually to initialize.
 *
 * Note: Agent approval confirmation is handled automatically by ApproveAgentUseCase
 * through the injected AgentApprovalConfirmationPort. All operations that require
 * an agent wallet (order placement, closing positions, TP/SL, etc.) will
 * automatically trigger user confirmation when needed.
 *
 * @example
 * ```tsx
 * import { useAgent } from '@/app-internal/features/agent/hooks/useAgent';
 *
 * const { loadAllAgents, revoke, approve, isLoading } = useAgent();
 *
 * // Load agents manually
 * const handleRefresh = async () => {
 *   await loadAllAgents();
 * };
 *
 * // Revoke an agent
 * const handleRevoke = async (agentName: string) => {
 *   const success = await revoke(agentName);
 *   if (success) {
 *     // Refresh after revoke
 *     await loadAllAgents();
 *   }
 * };
 * ```
 */

import { useCallback, useState } from 'react';

import { useContainer } from '@/app-internal/di';
import { useWalletContext } from '@/app-internal';
import { DEFAULT_AGENT_NAME } from '@/contexts/agent/constants';
import { agentStateStore } from '../agentStateStore';

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
   * Approve the Riverrun Agent (manual approval)
   *
   * This is different from automatic approval during tryGetAgentWallet.
   * Use this when user explicitly wants to approve the agent in settings.
   *
   * @returns True if approved successfully, false if user cancelled
   */
  approve: () => Promise<boolean>;

  /**
   * Revoke a named agent from blockchain
   * @param agentName - Name of the agent to revoke
   * @returns True if revoked successfully, false otherwise
   */
  revoke: (agentName: string) => Promise<boolean>;
}

/**
 * Hook for agent business operations
 */
export function useAgent(): UseAgentResult {
  // Get UseCases from DI container
  const getAgentStatus = useContainer(c => c.getAgentStatusUseCase);
  const approveAgent = useContainer(c => c.approveAgentUseCase);
  const revokeAgent = useContainer(c => c.revokeAgentUseCase);

  // Get wallet context
  const { wallet, getSigner } = useWalletContext();

  // UI state management (presentation layer only)
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load all agents and update store
   */
  const loadAllAgents = useCallback(async () => {
    if (!wallet) {
      // No wallet connected - clear state
      agentStateStore.getState().clear();
      return;
    }

    setIsLoading(true);
    try {
      const provider = await wallet.getProvider();

      // Call GetAgentStatusUseCase
      const status = await getAgentStatus.execute({
        masterAddress: wallet.address,
        provider,
      });

      // Update store with results
      agentStateStore.getState().updateState({
        agentAddress: status.agentAddress,
        allAgents: status.allAgents,
      });
    } catch (error) {
      console.error('[useAgent] Failed to load agents:', error);
      agentStateStore.getState().clear();
    } finally {
      setIsLoading(false);
    }
  }, [wallet, getAgentStatus]);

  /**
   * Approve Riverrun Agent (manual approval)
   */
  const approve = useCallback(async () => {
    if (!wallet) {
      return false;
    }

    setIsLoading(true);
    try {
      const provider = await wallet.getProvider();
      const signer = await getSigner();

      // Get or create agent wallet to get agent address
      const status = await getAgentStatus.execute({
        masterAddress: wallet.address,
        provider,
      });

      if (!status.agentAddress) {
        console.error('[useAgent] No agent address available');
        return false;
      }

      // Call ApproveAgentUseCase
      const success = await approveAgent.execute({
        signer,
        agentAddress: status.agentAddress,
        agentName: DEFAULT_AGENT_NAME,
      });

      if (success) {
        // Refresh agents after approval
        await loadAllAgents();
      }

      return success;
    } catch (error) {
      console.error('[useAgent] Failed to approve agent:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [wallet, getSigner, getAgentStatus, approveAgent, loadAllAgents]);

  /**
   * Revoke an agent
   */
  const revoke = useCallback(
    async (agentName: string) => {
      if (!wallet) {
        return false;
      }

      setIsLoading(true);
      try {
        const signer = await getSigner();

        // Call RevokeAgentUseCase
        await revokeAgent.execute({
          signer,
          agentName,
          masterAddress: wallet.address,
        });

        // Refresh agents after revocation
        await loadAllAgents();

        return true;
      } catch (error) {
        console.error('[useAgent] Failed to revoke agent:', error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [wallet, getSigner, revokeAgent, loadAllAgents],
  );

  return {
    isLoading,
    loadAllAgents,
    approve,
    revoke,
  };
}
