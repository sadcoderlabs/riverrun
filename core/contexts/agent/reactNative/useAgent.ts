import { useCallback, useState } from 'react';

import { useContainer } from '@/core/app-internal/di';

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
   * Revoke a named agent from blockchain
   * @param agentName - Name of the agent to revoke
   * Throws error if revocation fails
   */
  revoke: (agentName: string) => Promise<boolean>;
}

/**
 * useAgent - Agent business operations hook
 *
 * This hook provides agent-related business operations.
 * For state access, use useAgentStore instead for better performance.
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadAllAgents() to initialize.
 *
 * Note: Agent approval confirmation is handled automatically by the service layer
 * through the injected AgentApprovalConfirmationPort. All operations that require
 * an agent wallet (order placement, closing positions, TP/SL, etc.) will
 * automatically trigger user confirmation when needed.
 *
 * @example
 * ```tsx
 * import { useAgent } from '@/core/composition';
 *
 * const { loadAllAgents, isLoading } = useAgent();
 *
 * // Load agents on mount
 * useEffect(() => {
 *   loadAllAgents();
 * }, [loadAllAgents]);
 * ```
 */
export function useAgent(): UseAgentResult {
  const agentService = useContainer(c => c.agentService);

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

  return {
    isLoading,
    loadAllAgents,
    revoke,
  };
}
