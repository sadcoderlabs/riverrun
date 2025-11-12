/**
 * Referral Store Hook
 *
 * Provides direct access to referral state store for React components.
 * Use custom selectors for optimal performance - only subscribes to the fields you actually use.
 */

import { useStore } from 'zustand';
import { referralStateStore } from '../adapters/referralStateStore';

/**
 * Hook to access referral store
 *
 * Use this with your own selectors for reactive updates.
 * Only subscribes to the specific fields you select.
 *
 * @example
 * ```typescript
 * // Only re-render when referralInfo changes
 * const referralInfo = useReferralStore(state => state.referralInfo);
 *
 * // Only re-render when hasReferrer changes
 * const hasReferrer = useReferralStore(state => state.hasReferrer);
 *
 * // Combine multiple fields (will re-render when any of them changes)
 * const { referralInfo, hasReferrer } = useReferralStore(state => ({
 *   referralInfo: state.referralInfo,
 *   hasReferrer: state.hasReferrer,
 * }));
 * ```
 */
export function useReferralStore<T>(
  selector: (state: ReturnType<typeof referralStateStore.getState>) => T,
): T {
  return useStore(referralStateStore, selector);
}
