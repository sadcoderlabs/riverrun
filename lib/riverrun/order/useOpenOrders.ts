/**
 * Hook to manage user's open orders using a hybrid approach:
 * 1. Fetches initial open orders using frontendOpenOrders
 * 2. Subscribes to orderUpdates WebSocket for real-time updates
 * 3. Fetches complete order data using orderStatus when updates arrive
 *
 * This approach is simpler than the previous version:
 * - No complex order type inference logic
 * - No complex merging logic
 * - Just fetch complete data for each order update
 */

import { useWalletContext } from '@/core/composition';
import type { Order } from '@/lib/riverrun/order/orders';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import * as infoClient from '@/core/infra/hyperliquid/client/infoClient';
import { useSubscription } from '@/core/infra/hyperliquid/subscription';

// ============================================================================
// Hook Interface
// ============================================================================

export interface UseOpenOrdersResult {
  /** All open orders in flat array */
  orders: Order[];
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: Error | undefined;
}

// ============================================================================
// WebSocket Update Types
// ============================================================================

interface OrderUpdate {
  order: {
    coin: string;
    side: 'B' | 'A';
    limitPx: string;
    sz: string;
    oid: number;
    timestamp: number;
    origSz: string;
  };
  status?: string;
}

// ============================================================================
// Failed Order Status Detection
// ============================================================================

/**
 * All possible rejected/canceled status values from Hyperliquid API
 * Source: https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint#query-order-status-by-oid-or-cloid
 */
const FAILED_ORDER_STATUSES = new Set([
  // User canceled
  'canceled',
  // System rejected at placement
  'rejected',
  'tickRejected',
  'minTradeNtlRejected',
  'perpMarginRejected',
  'reduceOnlyRejected',
  'badAloPxRejected',
  'iocCancelRejected',
  'badTriggerPxRejected',
  'marketOrderNoLiquidityRejected',
  'positionIncreaseAtOpenInterestCapRejected',
  'positionFlipAtOpenInterestCapRejected',
  'tooAggressiveAtOpenInterestCapRejected',
  'openInterestIncreaseRejected',
  'insufficientSpotBalanceRejected',
  'oracleRejected',
  'perpMaxPositionRejected',
  // System canceled after placement
  'marginCanceled',
  'vaultWithdrawalCanceled',
  'openInterestCapCanceled',
  'selfTradeCanceled',
  'reduceOnlyCanceled',
  'siblingFilledCanceled',
  'delistedCanceled',
  'liquidatedCanceled',
  'scheduledCancel',
  // Filled (not an error but removes the order)
  'filled',
]);

// ============================================================================
// Main Hook
// ============================================================================

export function useOpenOrders(): UseOpenOrdersResult {
  const { wallet } = useWalletContext();
  const [mergedOrders, setMergedOrders] = useState<Order[]>([]);

  // Step 1: HTTP fetch initial open orders using TanStack Query
  const {
    data: httpData,
    isLoading: isHttpLoading,
    error: httpError,
  } = useQuery({
    queryKey: ['frontendOpenOrders', wallet?.address],
    queryFn: async () => {
      if (!wallet) return null;
      return (await infoClient.frontendOpenOrders({ user: wallet.address })) as Order[];
    },
    enabled: !!wallet,
  });

  // Initialize with HTTP data
  useEffect(() => {
    if (httpData) {
      setMergedOrders(httpData);
    }
  }, [httpData]);

  // Step 2: WebSocket subscription using useSubscription
  const { data: wsData } = useSubscription<{ updates: OrderUpdate[] }>(
    'orderUpdates',
    wallet ? { user: wallet.address } : undefined,
  );

  // Step 3: Process WebSocket updates
  useEffect(() => {
    if (!wsData?.updates || !wallet) return;

    const processUpdates = async () => {
      const updatedOrdersMap = new Map<number, Order | null>();

      for (const update of wsData.updates) {
        const oid = update.order.oid;
        const status = update.status;

        // If order was canceled or filled, mark for removal
        if (status && FAILED_ORDER_STATUSES.has(status)) {
          updatedOrdersMap.set(oid, null);
          continue;
        }

        // Fetch complete order data using orderStatus
        try {
          const orderData = await infoClient.orderStatus({
            user: wallet.address,
            oid,
          });

          // orderStatus returns { status: string, order?: Order }
          if (orderData.status === 'order' && orderData.order) {
            // Extract just the order data we need
            updatedOrdersMap.set(oid, orderData.order as any);
          } else if (orderData.status && FAILED_ORDER_STATUSES.has(orderData.status)) {
            // Order is no longer open (canceled/filled)
            updatedOrdersMap.set(oid, null);
          }
        } catch (error) {
          console.error(`[useOpenOrders] Failed to fetch order ${oid}:`, error);
          // Keep existing order data if fetch fails
        }
      }

      // Update merged orders
      setMergedOrders(prevOrders => {
        // Build a map from existing orders
        const orderMap = new Map(prevOrders.map(order => [order.oid, order]));

        // Apply updates
        updatedOrdersMap.forEach((order, oid) => {
          if (order === null) {
            // Remove order
            orderMap.delete(oid);
          } else {
            // Add or update order
            orderMap.set(oid, order);
          }
        });

        return Array.from(orderMap.values());
      });
    };

    void processUpdates();
  }, [wsData, wallet]);

  // Reset orders when wallet disconnects
  useEffect(() => {
    if (!wallet) {
      setMergedOrders([]);
    }
  }, [wallet]);

  return {
    orders: mergedOrders,
    isLoading: isHttpLoading,
    error: httpError instanceof Error ? httpError : undefined,
  };
}

// Re-export types for convenience
export type { Order } from '@/lib/riverrun/order/orders';
