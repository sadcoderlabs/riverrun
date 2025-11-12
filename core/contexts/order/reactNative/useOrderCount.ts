/**
 * useOrderCount - Get the count of open orders
 *
 * Returns real-time count from orderStore.
 */

import { useWalletContext } from '@/core/contexts/wallet/reactNative/useWalletContext';
import { useMemo } from 'react';
import { useOrderStore } from './useOrderStore';

/**
 * Get the count of open orders
 *
 * @returns number of open orders
 */
export function useOrderCount(): number {
  const { wallet } = useWalletContext();
  const orders = useOrderStore(state => state.orders);

  const count = useMemo(() => {
    if (!wallet) {
      return 0;
    }

    // Return the count of orders
    return orders.length;
  }, [wallet, orders]);

  return count;
}
