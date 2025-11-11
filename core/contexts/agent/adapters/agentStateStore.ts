import { createStore } from 'zustand/vanilla';

import type { AgentInfo, AgentState } from '../ports/types';

interface AgentStateStore extends AgentState {
  /**
   * Set all agents list
   */
  setAllAgents: (agents: AgentInfo[]) => void;

  /**
   * Update multiple state fields at once
   */
  updateState: (partial: Partial<AgentState>) => void;
}

const initialState: AgentState = {
  agentAddress: undefined,
  isApproved: false,
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

  setAllAgents: agents => set({ allAgents: agents }),
  updateState: partial => set(partial),
}));
