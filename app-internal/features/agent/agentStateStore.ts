/**
 * Agent State Store - UI Layer State Management
 *
 * Migrated from contexts/agent/adapters/ to app-internal/features/agent/
 * This store is part of the UI layer and is updated by UI hooks, not by UseCases.
 */

import { createStore } from 'zustand/vanilla';

import type { AgentInfo, AgentState } from '@/contexts/agent/ports/types';

interface AgentStateStore extends AgentState {
  /**
   * Set all agents list
   */
  setAllAgents: (agents: AgentInfo[]) => void;

  /**
   * Update multiple state fields at once
   */
  updateState: (partial: Partial<AgentState>) => void;

  /**
   * Clear all state
   */
  clear: () => void;
}

const initialState: AgentState = {
  agentAddress: undefined,
  allAgents: [],
};

/**
 * Agent State Store (Vanilla Zustand)
 *
 * Manages agent state including approval status and agent list.
 * This store is updated by UI hooks (useAgent, useAgentAutoSync) and consumed by UI components.
 *
 * Architecture (UseCase Pattern):
 * - UseCases perform business logic and return results
 * - UI hooks call UseCases and update this store
 * - UI components subscribe to this store for reactive updates
 *
 * This is part of the UI layer - it adapts React's reactive model
 * to the stateless UseCases.
 */
export const agentStateStore = createStore<AgentStateStore>(set => ({
  ...initialState,

  setAllAgents: agents => set({ allAgents: agents }),
  updateState: partial => set(partial),
  clear: () => set(initialState),
}));
