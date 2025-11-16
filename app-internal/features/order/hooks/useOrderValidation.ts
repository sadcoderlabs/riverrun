/**
 * useOrderValidation - Validate order inputs
 *
 * Validates:
 * - Size: Must be non-empty and non-zero
 * - Limit price: Must be valid for Limit orders
 * - TP/SL: Must pass TP/SL validation
 */

import { useMemo } from 'react';
import type { TpSlValidationResult } from '@/app-internal/components/trade/TpSlInput';

export type OrderType = 'Market' | 'Limit';

interface UseOrderValidationParams {
  orderType: OrderType;
  size: string;
  limitPrice: string;
  tpSlValidation: TpSlValidationResult;
}

interface UseOrderValidationResult {
  isValid: boolean;
  errorTitle?: string;
  errorDescription?: string;
  hasValidSize: boolean;
  hasValidLimitPrice: boolean;
}

/**
 * Hook to validate order inputs
 *
 * @param params - { orderType, size, limitPrice, tpSlValidation }
 * @returns Validation result with error details
 */
export function useOrderValidation({
  orderType,
  size,
  limitPrice,
  tpSlValidation,
}: UseOrderValidationParams): UseOrderValidationResult {
  return useMemo(() => {
    // Check if size is valid (not empty, not zero)
    const hasValidSize = !!(size && size !== '' && size !== '0');

    // Check if limit price is valid for Limit orders
    const hasValidLimitPrice =
      orderType === 'Market' || !!(limitPrice && limitPrice !== '' && limitPrice !== '0');

    // Check size validation
    if (!hasValidSize) {
      return {
        isValid: false,
        errorTitle: 'Size Required',
        errorDescription: 'Please enter an order size',
        hasValidSize,
        hasValidLimitPrice,
      };
    }

    // Check limit price validation
    if (!hasValidLimitPrice) {
      return {
        isValid: false,
        errorTitle: 'Invalid Price',
        errorDescription: 'Please enter a valid limit price',
        hasValidSize,
        hasValidLimitPrice,
      };
    }

    // Check TP/SL validation
    if (!tpSlValidation.isValid) {
      return {
        isValid: false,
        errorTitle: tpSlValidation.errorTitle || 'Invalid TP/SL',
        errorDescription: tpSlValidation.errorDescription || 'Please check your TP/SL values',
        hasValidSize,
        hasValidLimitPrice,
      };
    }

    return {
      isValid: true,
      hasValidSize,
      hasValidLimitPrice,
    };
  }, [orderType, size, limitPrice, tpSlValidation]);
}
