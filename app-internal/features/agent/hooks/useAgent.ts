/**
 * useAgent - Agent business operations and state management hook
 *
 * This hook provides agent-related business operations using UseCases
 * and manages agent state using local useState (similar to BuilderFee/Referral).
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadAllAgents() manually
 * to initialize or refresh agent state.
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
 * const { loadAllAgents, revoke, approve, isLoading, agentAddress, allAgents, isApproved } = useAgent();
 *
 * // Load agents on mount
 * useEffect(() => {
 *   loadAllAgents();
 * }, [loadAllAgents]);
 *
 * // Revoke an agent
 * const handleRevoke = async (agentName: string) => {
 *   const success = await revoke(agentName);
 *   if (success) {
 *     // State is automatically refreshed after revoke
 *   }
 * };
 * ```
 */

import { useCallback, useState, useMemo } from 'react';

import { useContainer } from '@/app-internal/di';
import { useWalletContext } from '@/app-internal';
import { DEFAULT_AGENT_NAME } from '@/contexts/agent/constants';
import type { AgentInfo } from '@/contexts/agent/ports/types';

export interface UseAgentResult {
  /**
   * Current agent address (from storage)
   */
  agentAddress: string | undefined;

  /**
   * All agents for the current user (from blockchain)
   */
  allAgents: AgentInfo[];

  /**
   * Whether the current agent is approved on blockchain
   * Derived state: true if agentAddress exists in allAgents
   */
  isApproved: boolean;

  /**
   * Loading state for agent operations
   */
  isLoading: boolean;

  /**
   * Load all agents from blockchain
   *
   * Fetches agent data and updates local state.
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
 * Hook for agent business operations and state management
 */
export function useAgent(): UseAgentResult {
  // Get UseCases from DI container
  const getAgentStatus = useContainer(c => c.getAgentStatusUseCase);
  const approveAgent = useContainer(c => c.approveAgentUseCase);
  const revokeAgent = useContainer(c => c.revokeAgentUseCase);

  // Get wallet context
  const { wallet, getSigner } = useWalletContext();

  // Local state management (similar to BuilderFee/Referral pattern)
  const [agentAddress, setAgentAddress] = useState<string | undefined>(undefined);
  const [allAgents, setAllAgents] = useState<AgentInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Derived state: Calculate isApproved
  const isApproved = useMemo(() => {
    if (!agentAddress || allAgents.length === 0) {
      return false;
    }
    return allAgents.some(agent => agent.address.toLowerCase() === agentAddress.toLowerCase());
  }, [agentAddress, allAgents]);

  /**
   * Load all agents and update local state
   */
  const loadAllAgents = useCallback(async () => {
    if (!wallet) {
      // No wallet connected - clear state
      setAgentAddress(undefined);
      setAllAgents([]);
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

      // Update local state with results
      setAgentAddress(status.agentAddress);
      setAllAgents(status.allAgents);
    } catch (error) {
      console.error('[useAgent] Failed to load agents:', error);
      setAgentAddress(undefined);
      setAllAgents([]);
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
    agentAddress,
    allAgents,
    isApproved,
    isLoading,
    loadAllAgents,
    approve,
    revoke,
  };
}
