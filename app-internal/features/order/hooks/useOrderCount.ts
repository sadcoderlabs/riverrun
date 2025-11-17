/**
 * useOrderCount - Get the count of open orders
 *
 * Returns real-time count from orderStore.
 */

import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { useMemo } from 'react';
import { useOrderStore } from './useOrderStore';

/**
 * Get the count of open orders
 *
 * @returns number of open orders
 */
export function useOrderCount(): number {
  const { wallet } = useWallet();
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
