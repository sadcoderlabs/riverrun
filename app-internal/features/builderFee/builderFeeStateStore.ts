import { createStore } from 'zustand/vanilla';

import type { BuilderFeeStatus } from '@/contexts/builderFee/ports/types';

interface BuilderFeeState extends BuilderFeeStatus {}

export interface BuilderFeeStateStore extends BuilderFeeState {
  /**
   * Update builder fee status
   */
  updateStatus: (status: BuilderFeeStatus) => void;

  /**
   * Reset state to initial values
   */
  reset: () => void;
}

const initialState: BuilderFeeState = {
  maxApprovedFee: 0,
  isApproved: false,
};

/**
 * Builder Fee State Store (Vanilla Zustand)
 *
 * Manages builder fee approval state.
 * This store is updated by BuilderFeeService and consumed by UI components.
 *
 * Architecture:
 * - BuilderFeeService performs business logic and updates this store
 * - UI components subscribe to this store for reactive updates
 *
 * This is part of the adapters layer - it adapts React's reactive model
 * to the vanilla BuilderFeeService.
 */
export const builderFeeStateStore = createStore<BuilderFeeStateStore>(set => ({
  ...initialState,

  updateStatus: status => set(status),
  reset: () => set(initialState),
}));
