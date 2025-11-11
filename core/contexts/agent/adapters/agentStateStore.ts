import { createStore } from 'zustand/vanilla';
import { useStore } from 'zustand';

import type { AgentInfo, AgentState } from '../ports/types';

interface AgentStateStore extends AgentState {
  /**
   * Set agent address
   */
  setAgentAddress: (address: string | undefined) => void;

  /**
   * Set approval status
   */
  setIsApproved: (isApproved: boolean) => void;

  /**
   * Set loading state
   */
  setIsLoading: (isLoading: boolean) => void;

  /**
   * Set all agents list
   */
  setAllAgents: (agents: AgentInfo[]) => void;

  /**
   * Update multiple state fields at once
   */
  updateState: (partial: Partial<AgentState>) => void;

  /**
   * Reset to initial state
   */
  reset: () => void;
}

const initialState: AgentState = {
  agentAddress: undefined,
  isApproved: false,
  isLoading: false,
  allAgents: [],
};

/**
 * Agent State Store (Vanilla Zustand)
 *
 * Manages agent state including approval status and agent list.
 * This store is updated by AgentService and consumed by UI components.
 *
 * Architecture:
 * - AgentService performs business logic and updates this store
 * - UI components subscribe to this store for reactive updates
 *
 * This is part of the adapters layer - it adapts React's reactive model
 * to the vanilla AgentService.
 */
export const agentStateStore = createStore<AgentStateStore>(set => ({
  ...initialState,

  setAgentAddress: address => set({ agentAddress: address }),
  setIsApproved: isApproved => set({ isApproved }),
  setIsLoading: isLoading => set({ isLoading }),
  setAllAgents: agents => set({ allAgents: agents }),
  updateState: partial => set(partial),
  reset: () => set(initialState),
}));

/**
 * React hook for accessing agent state store
 *
 * This binds the vanilla store to React, allowing components to subscribe
 * to state changes and trigger re-renders.
 *
 * @example
 * ```tsx
 * const agentAddress = useAgentStateStore(state => state.agentAddress);
 * const isApproved = useAgentStateStore(state => state.isApproved);
 * ```
 */
export const useAgentStateStore = () => useStore(agentStateStore);
