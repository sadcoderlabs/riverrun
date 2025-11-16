/**
 * Agent Store Hook
 *
 * Provides direct access to agent state store for React components.
 * Use custom selectors for optimal performance - only subscribes to the fields you actually use.
 */

import { useStore } from 'zustand';
import { agentStateStore } from '../agentStateStore';

/**
 * Hook to access agent store
 *
 * Use this with your own selectors for reactive updates.
 * Only subscribes to the specific fields you select.
 *
 * @example
 * ```typescript
 * // Only re-render when agentAddress changes
 * const agentAddress = useAgentStore(state => state.agentAddress);
 *
 * // Only re-render when isApproved changes
 * const isApproved = useAgentStore(state => state.isApproved);
 *
 * // Get all agents
 * const allAgents = useAgentStore(state => state.allAgents);
 *
 * // Combine multiple fields (will re-render when any of them changes)
 * const { agentAddress, isApproved } = useAgentStore(state => ({
 *   agentAddress: state.agentAddress,
 *   isApproved: state.isApproved,
 * }));
 * ```
 */
export function useAgentStore<T>(
  selector: (state: ReturnType<typeof agentStateStore.getState>) => T,
): T {
  return useStore(agentStateStore, selector);
}
