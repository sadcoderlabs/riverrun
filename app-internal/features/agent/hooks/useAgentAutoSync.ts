/**
 * useAgentAutoSync - Auto-sync agent state when wallet changes
 *
 * This hook automatically reloads agent data when the wallet address changes.
 * It should be used once at the app root level to enable auto-sync throughout the app.
 *
 * Architecture:
 * - Listens to wallet changes via useWalletContext
 * - Calls GetAgentStatusUseCase to fetch fresh data
 * - Updates agentStateStore for reactive UI updates
 *
 * Usage:
 * ```tsx
 * // In app root (_layout.tsx)
 * function RootLayout() {
 *   useAgentAutoSync();  // Enable auto-sync
 *   return <Stack />;
 * }
 * ```
 *
 * Note: This replaces the auto-sync logic that was previously in AgentService constructor.
 */

import { useEffect } from 'react';

import { useContainer } from '@/app-internal/di';
import { useWalletContext } from '@/app-internal';
import { agentStateStore } from '../agentStateStore';

/**
 * Hook for auto-syncing agent state with wallet changes
 */
export function useAgentAutoSync(): void {
  const getAgentStatus = useContainer(c => c.getAgentStatusUseCase);
  const { wallet } = useWalletContext();

  useEffect(() => {
    // Clear state when no wallet
    if (!wallet) {
      agentStateStore.getState().clear();
      return;
    }

    // Auto-load agent data when wallet changes
    const loadAgentData = async () => {
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

        console.log('[useAgentAutoSync] Loaded agents:', {
          agentAddress: status.agentAddress,
          allAgentsCount: status.allAgents.length,
        });
      } catch (error) {
        console.error('[useAgentAutoSync] Failed to load agents:', error);
        agentStateStore.getState().clear();
      }
    };

    void loadAgentData();
  }, [wallet, getAgentStatus]); // Re-run when wallet changes
}
