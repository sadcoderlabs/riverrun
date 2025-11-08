/**
 * Hook to get the count of open orders
 * Returns real-time count from useOpenOrders
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useMemo } from 'react';
import { useOpenOrders } from './useOpenOrders';

/**
 * Get the count of open orders
 * @returns number of open orders
 */
export function useOrderCount(): number {
  const { wallet } = useActiveWallet();
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
