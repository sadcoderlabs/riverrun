/**
 * useOrderValue - Calculate the notional value of an order
 *
 * Order value = size × executionPrice
 *
 * This value is used for:
 * - Calculating margin required (orderValue / leverage)
 * - Displaying total order value to the user
 * - Risk management calculations
 */

import { useMemo } from 'react';

interface UseOrderValueParams {
  size: string;
  executionPrice: number;
}

interface UseOrderValueResult {
  orderValue: number;
}

/**
 * Hook to calculate the notional value of an order
 *
 * @param params - { size, executionPrice }
 * @returns { orderValue: number }
 */
export function useOrderValue({ size, executionPrice }: UseOrderValueParams): UseOrderValueResult {
  const orderValue = useMemo(() => {
    const sizeNum = parseFloat(size || '0');
    if (sizeNum <= 0 || executionPrice <= 0) return 0;
    return sizeNum * executionPrice;
  }, [size, executionPrice]);

  return { orderValue };
}
