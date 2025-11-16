/**
 * Referral State Store
 *
 * Zustand store for managing referral state in the UI.
 * This adapter allows React components to reactively access referral information.
 */

import { createStore } from 'zustand/vanilla';

import type { ReferralInfo, ReferralState } from '../ports/types';

/**
 * Actions for updating referral state
 */
interface ReferralStateActions {
  /**
   * Update referral information
   */
  updateReferralInfo: (info: ReferralInfo) => void;

  /**
   * Reset referral state to initial values
   */
  reset: () => void;
}

/**
 * Initial referral state
 */
const initialState: ReferralState = {
  referralInfo: {
    referrer: undefined,
    code: undefined,
    cumVlm: '0',
  },
  hasReferrer: false,
};

/**
 * Referral state store (vanilla Zustand)
 */
export const referralStateStore = createStore<ReferralState & ReferralStateActions>(set => ({
  ...initialState,

  updateReferralInfo: (info: ReferralInfo) =>
    set({
      referralInfo: info,
      hasReferrer: info.referrer !== undefined,
    }),

  reset: () => set(initialState),
}));
