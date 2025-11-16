/**
 * useOrderSubscription - Manages real-time order data subscriptions
 *
 * This hook automatically:
 * - Monitors active wallet changes
 * - Manages order subscriptions (HTTP + WebSocket hybrid)
 * - Updates order store with real-time data
 * - Handles order lifecycle events (created, updated, canceled, filled)
 *
 * Design: React Hook for subscription management
 * - Embraces React lifecycle (useEffect)
 * - Manages subscriptions automatically
 * - Updates orderStore directly
 */

import { useEffect, useMemo } from 'react';
import { useStore } from 'zustand';

import { activeWalletStore } from '@/contexts/wallet/adapters/activeWalletStore';
import {
  HyperliquidGateway,
  type SubscriptionHandle,
} from '@/infra/hyperliquid/hyperliquidGateway';
import { orderStore } from '../../../../contexts/order/adapters/orderStore';
import type { Order } from '../../../../contexts/order/ports/types';

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
// Data Processing Functions (Testable)
// ============================================================================

/**
 * Handle WebSocket order updates
 * Exported for testing purposes
 */
export async function handleOrderUpdates(
  updates: {
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
  }[],
  userAddress: string,
  gateway: HyperliquidGateway,
): Promise<void> {
  if (!updates || updates.length === 0) return;

  for (const update of updates) {
    const oid = update.order.oid;
    const status = update.status;

    // If order was canceled or filled, remove it
    if (status && FAILED_ORDER_STATUSES.has(status)) {
      orderStore.getState().removeOrder(oid);
      continue;
    }

    // Fetch complete order data using orderStatus
    try {
      const orderDataRaw = await gateway.getOrderStatus(userAddress, oid);
      // Cast to the expected type structure (double-nested)
      // API returns: { status: "order", order: { order: Order, status: string, statusTimestamp: number } }
      const orderData = orderDataRaw as {
        status: string;
        order?: {
          order: Order;
          status: string;
          statusTimestamp: number;
        };
      };

      // orderStatus returns { status: string, order?: { order: Order, status: string } }
      if (orderData.status === 'order' && orderData.order?.order) {
        // Extract the actual Order object from the nested structure
        const actualOrder = orderData.order.order;
        const currentOrders = orderStore.getState().orders;
        const existingOrder = currentOrders.find(o => o.oid === oid);

        if (existingOrder) {
          orderStore.getState().updateOrder(oid, actualOrder);
        } else {
          orderStore.getState().setOrders([...currentOrders, actualOrder]);
        }
      } else if (orderData.order?.status && FAILED_ORDER_STATUSES.has(orderData.order.status)) {
        // Order is no longer open (check the nested status field)
        orderStore.getState().removeOrder(oid);
      } else if (orderData.status && FAILED_ORDER_STATUSES.has(orderData.status)) {
        // Order is no longer open (check the top-level status field)
        orderStore.getState().removeOrder(oid);
      }
    } catch (error) {
      console.error(`[useOrderSubscription] Failed to fetch order ${oid}:`, error);
      // Keep existing order data if fetch fails
    }
  }
}

// ============================================================================
// Subscription Hook
// ============================================================================

/**
 * useOrderSubscription - Automatically manages order subscriptions
 *
 * Usage:
 * ```tsx
 * export function OrderCompositionProvider({ children }) {
 *   useOrderSubscription();  // That's it!
 *   return <OrderContext.Provider>{children}</OrderContext.Provider>;
 * }
 * ```
 */
export function useOrderSubscription() {
  const wallet = useStore(activeWalletStore, state => state.wallet);
  const walletAddress = wallet?.address;
  const gateway = useMemo(() => new HyperliquidGateway(), []);

  useEffect(() => {
    // No wallet - clear orders
    if (!walletAddress) {
      orderStore.getState().clear();
      return;
    }

    let subscription: SubscriptionHandle | undefined;
    let isCancelled = false;

    (async () => {
      try {
        orderStore.getState().setLoading(true);

        // Step 1: HTTP fetch initial open orders
        const initialOrders = await gateway.getFrontendOpenOrders(walletAddress);

        // Check if effect was cancelled during async operation
        if (isCancelled) return;

        orderStore.getState().setOrders(initialOrders as Order[]);
        orderStore.getState().setLoading(false);

        // Step 2: Subscribe to orderUpdates WebSocket
        subscription = await gateway.subscribeOrderUpdates(walletAddress, (data: unknown) => {
          // Cast to wrapper object type containing updates array
          const orderUpdatesData = data as {
            updates: {
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
            }[];
          };

          // Don't process if effect was cancelled
          if (!isCancelled) {
            handleOrderUpdates(orderUpdatesData.updates, walletAddress, gateway);
          }
        });
      } catch (error) {
        console.error('[useOrderSubscription] Failed to start subscription:', error);
        if (!isCancelled) {
          orderStore.getState().setLoading(false);
        }
      }
    })();

    // Cleanup function
    return () => {
      isCancelled = true;
      subscription?.unsubscribe();
      orderStore.getState().clear();
    };
  }, [walletAddress, gateway]);
}
