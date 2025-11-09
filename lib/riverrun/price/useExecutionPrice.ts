import { useMemo } from 'react';

export type OrderType = 'Market' | 'Limit';

interface UseExecutionPriceParams {
  orderType: OrderType;
  limitPrice: string;
  markPrice: number;
}

interface UseExecutionPriceResult {
  executionPrice: number;
}

/**
 * Hook to calculate the execution price for an order
 *
 * The execution price is the price at which an order will be filled:
 * - Market order: Uses mark price as reference (actual execution may vary)
 * - Limit order: Uses limit price if valid, falls back to mark price
 *
 * This price is used for:
 * - Order value calculation (size × executionPrice)
 * - TP/SL entry price calculation
 * - Margin requirement calculation
 *
 * @param params - { orderType, limitPrice, markPrice }
 * @returns { executionPrice: number }
 */
export function useExecutionPrice({
  orderType,
  limitPrice,
  markPrice,
}: UseExecutionPriceParams): UseExecutionPriceResult {
  const executionPrice = useMemo(() => {
    if (orderType === 'Market') {
      return markPrice;
    } else {
      const limit = parseFloat(limitPrice || '0');
      return limit > 0 ? limit : markPrice;
    }
  }, [orderType, limitPrice, markPrice]);

  return { executionPrice };
}
