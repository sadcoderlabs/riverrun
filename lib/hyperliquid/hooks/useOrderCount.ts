/**
 * Hook to get the count of open orders
 * Returns real-time count from useOrderUpdates
 */

import { useActiveWallet } from '@/lib/riverrun/hooks/useActiveWallet';
import { useMemo } from 'react';
import { useOrderUpdates } from './useOrderUpdates';

/**
 * Get the count of open orders
 * @returns number of open orders
 */
export function useOrderCount(): number {
  const { isAuthenticated } = useActiveWallet();
  const { orders } = useOrderUpdates();

  const count = useMemo(() => {
    if (!isAuthenticated) {
      return 0;
    }

    // Return the count of orders
    return orders.length;
  }, [isAuthenticated, orders]);

  return count;
}
