/**
 * Hook to manage user's order updates using the unified subscription system
 *
 * This hook provides:
 * - Reference counting: multiple components share one subscription
 * - Global rate limiting: prevents 429 errors
 * - Hybrid approach: fast HTTP fetch + WebSocket updates
 *
 * Returns all open orders in a flat array.
 */

import { useActiveWallet } from '@/lib/riverrun/wallet/useActiveWallet';
import { useSubscription, type OrderUpdatesData } from '../subscription';
import type { Order } from '../types/orders';
import { useMemo } from 'react';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseOrderUpdatesResult {
  /** All open orders in flat array */
  orders: Order[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// Main Hook
// ============================================================================

export function useOrderUpdates(): UseOrderUpdatesResult {
  const { wallet } = useActiveWallet();

  // Subscribe using unified subscription system
  const { data, isLoading, error } = useSubscription<OrderUpdatesData>(
    'orderUpdates',
    wallet ? { user: wallet.address } : undefined,
  );

  return useMemo(
    () => ({
      orders: data?.orders ?? [],
      isLoading,
      error,
    }),
    [data?.orders, isLoading, error],
  );
}

// Re-export types for convenience
export type { Order } from '../types/orders';
