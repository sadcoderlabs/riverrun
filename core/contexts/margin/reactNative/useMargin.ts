/**
 * useMargin - Margin Business Operations Hook
 *
 * Provides business operations for margin/leverage management.
 * For state access, use useMarginStore instead for better performance.
 */

import { useCallback, useState } from 'react';
import { useContainer } from '@/core/app-internal/di';
import type { MarginLeverage, SetMarginLeverageParams } from '../ports/types';

export interface UseMarginResult {
  /** UI loading state (for setMarginLeverage operation) */
  isUpdating: boolean;

  /** Business operations */
  setMarginLeverage: (params: SetMarginLeverageParams) => Promise<void>;
  getMarginLeverage: () => MarginLeverage | undefined;
}

/**
 * useMargin - Margin business operations hook
 *
 * For state access, use useMarginStore instead for better performance.
 *
 * @example
 * ```typescript
 * // State access - use useMarginStore
 * const marginLeverage = useMarginStore(state => state.marginLeverage);
 * const isLoading = useMarginStore(state => state.isLoading);
 *
 * // Business operations - use useMargin
 * const { setMarginLeverage, isUpdating } = useMargin();
 *
 * // Usage
 * const handleUpdate = async () => {
 *   try {
 *     await setMarginLeverage({ leverage: 10, marginMode: 'isolated' });
 *   } catch (error) {
 *     console.error('Failed to update leverage:', error);
 *   }
 * };
 * ```
 */
export function useMargin(): UseMarginResult {
  const marginService = useContainer(c => c.marginService);

  // UI state only (for setMarginLeverage operation)
  const [isUpdating, setIsUpdating] = useState(false);

  // Business operation: Update margin/leverage
  const setMarginLeverage = useCallback(
    async (params: SetMarginLeverageParams) => {
      setIsUpdating(true);
      try {
        await marginService.setMarginLeverage(params);
      } finally {
        setIsUpdating(false);
      }
    },
    [marginService],
  );

  // Query operation: Get margin/leverage
  const getMarginLeverage = useCallback(() => {
    return marginService.getMarginLeverage();
  }, [marginService]);

  return {
    isUpdating,
    setMarginLeverage,
    getMarginLeverage,
  };
}
