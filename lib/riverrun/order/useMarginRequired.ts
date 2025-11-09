import { useMemo } from 'react';

interface UseMarginRequiredParams {
  orderValue: number;
  leverage: number;
}

interface UseMarginRequiredResult {
  marginRequired: number;
}

/**
 * Hook to calculate the margin required for an order
 *
 * Margin required = orderValue / leverage
 *
 * This represents the amount of collateral needed to open the position.
 * For example:
 * - Order value: $1000, Leverage: 10x → Margin required: $100
 * - Order value: $1000, Leverage: 1x → Margin required: $1000
 *
 * The margin required must be less than or equal to the available margin
 * for the order to be placed successfully.
 *
 * @param params - { orderValue, leverage }
 * @returns { marginRequired: number }
 */
export function useMarginRequired({
  orderValue,
  leverage,
}: UseMarginRequiredParams): UseMarginRequiredResult {
  const marginRequired = useMemo(() => {
    if (leverage <= 0) return 0;
    return orderValue / leverage;
  }, [orderValue, leverage]);

  return { marginRequired };
}
