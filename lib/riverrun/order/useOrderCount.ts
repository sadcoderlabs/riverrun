/**
 * Hook to get the count of open orders
 * Returns real-time count from useOpenOrders
 */

import { useWalletContext } from '@/core/composition';
import { useMemo } from 'react';
import { useOpenOrders } from './useOpenOrders';

/**
 * Get the count of open orders
 * @returns number of open orders
 */
export function useOrderCount(): number {
  const { wallet } = useWalletContext();
  const { orders } = useOpenOrders();

  const count = useMemo(() => {
    if (!wallet) {
      return 0;
    }

    // Return the count of orders
    return orders.length;
  }, [wallet, orders]);

  return count;
}
