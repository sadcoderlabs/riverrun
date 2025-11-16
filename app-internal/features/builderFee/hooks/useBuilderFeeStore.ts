/**
 * Builder Fee Store Hook
 *
 * Provides direct access to builder fee state store for React components.
 * Use custom selectors for optimal performance - only subscribes to the fields you actually use.
 */

import { useStore } from 'zustand';
import { builderFeeStateStore } from '../builderFeeStateStore';

/**
 * Hook to access builder fee store
 *
 * Use this with your own selectors for reactive updates.
 * Only subscribes to the specific fields you select.
 *
 * @example
 * ```typescript
 * // Only re-render when maxApprovedFee changes
 * const maxApprovedFee = useBuilderFeeStore(state => state.maxApprovedFee);
 *
 * // Only re-render when isApproved changes
 * const isApproved = useBuilderFeeStore(state => state.isApproved);
 *
 * // Combine multiple fields (will re-render when any of them changes)
 * const { maxApprovedFee, isApproved } = useBuilderFeeStore(state => ({
 *   maxApprovedFee: state.maxApprovedFee,
 *   isApproved: state.isApproved,
 * }));
 * ```
 */
export function useBuilderFeeStore<T>(
  selector: (state: ReturnType<typeof builderFeeStateStore.getState>) => T,
): T {
  return useStore(builderFeeStateStore, selector);
}
