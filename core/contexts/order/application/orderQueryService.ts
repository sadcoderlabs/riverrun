/**
 * Order Query Service - Manages real-time order data updates
 *
 * This service implements OrderQueryPort and is responsible for:
 * - Monitoring active wallet changes
 * - Managing order subscriptions (HTTP + WebSocket hybrid)
 * - Updating order store with real-time data
 * - Handling order lifecycle events (created, updated, canceled, filled)
 *
 * Design: Autonomous Service Pattern (CQRS Query Side)
 * - Automatically monitors wallet changes
 * - Manages subscription lifecycle internally
 * - Updates store directly (no return values needed)
 */

import { activeWalletStore } from '@/core/contexts/wallet/adapters/activeWalletStore';
import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '@/core/infra/hyperliquid/hyperliquidGateway';
import { orderStore } from '../adapters/orderStore';
import type { OrderQueryPort } from '../ports/orderQueryPort';
import type { Order } from '../ports/types';

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
// Order Query Service Implementation
// ============================================================================

export class OrderQueryService implements OrderQueryPort {
  // Subscription management
  private ordersSubscription: SubscriptionHandle | undefined;
  private walletUnsubscribe: (() => void) | undefined;

  constructor(private readonly hyperliquidGateway: HyperliquidGateway) {}

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Start the Order Subscription Service
   * Begins monitoring wallet changes and automatically manages subscriptions
   */
  start(): void {
    // Subscribe to wallet changes
    this.walletUnsubscribe = activeWalletStore.subscribe((state, prevState) => {
      const newAddress = state.wallet?.address;
      const prevAddress = prevState.wallet?.address;

      if (newAddress !== prevAddress) {
        if (newAddress) {
          this.startSubscription(newAddress);
        } else {
          this.stopSubscription();
        }
      }
    });

    // Handle initial wallet state
    const currentWallet = activeWalletStore.getState().wallet;
    if (currentWallet) {
      this.startSubscription(currentWallet.address);
    }
  }

  /**
   * Stop the Order Subscription Service
   * Stops monitoring and cleans up all subscriptions
   */
  stop(): void {
    this.walletUnsubscribe?.();
    this.walletUnsubscribe = undefined;
    this.stopSubscription();
  }

  // ==========================================================================
  // Subscription Management (Private)
  // ==========================================================================

  /**
   * Start order subscription for a user
   */
  private async startSubscription(userAddress: string): Promise<void> {
    // Stop existing subscription if any
    await this.stopSubscription();

    orderStore.getState().setLoading(true);

    try {
      // Step 1: HTTP fetch initial open orders
      const initialOrders = await this.hyperliquidGateway.getFrontendOpenOrders(userAddress);
      orderStore.getState().setOrders(initialOrders as Order[]);
      orderStore.getState().setLoading(false);

      // Step 2: Subscribe to orderUpdates WebSocket
      this.ordersSubscription = await this.hyperliquidGateway.subscribeOrderUpdates(
        userAddress,
        (updates: unknown) => {
          // Cast updates to the expected array type
          const typedUpdates = updates as {
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
          this.handleOrderUpdates(typedUpdates, userAddress);
        },
      );
    } catch (error) {
      console.error('[OrderQueryService] Failed to start subscription:', error);
      orderStore.getState().setLoading(false);
    }
  }

  /**
   * Stop order subscription
   */
  private async stopSubscription(): Promise<void> {
    if (this.ordersSubscription) {
      await this.ordersSubscription.unsubscribe();
      this.ordersSubscription = undefined;
    }

    orderStore.getState().clear();
  }

  /**
   * Handle WebSocket order updates
   */
  private async handleOrderUpdates(
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
        const orderDataRaw = await this.hyperliquidGateway.getOrderStatus(userAddress, oid);
        // Cast to the expected type structure
        const orderData = orderDataRaw as { status: string; order?: Order };

        // orderStatus returns { status: string, order?: Order }
        if (orderData.status === 'order' && orderData.order) {
          // Update or add the order
          const currentOrders = orderStore.getState().orders;
          const existingOrder = currentOrders.find(o => o.oid === oid);

          if (existingOrder) {
            orderStore.getState().updateOrder(oid, orderData.order);
          } else {
            orderStore.getState().setOrders([...currentOrders, orderData.order]);
          }
        } else if (orderData.status && FAILED_ORDER_STATUSES.has(orderData.status)) {
          // Order is no longer open (canceled/filled)
          orderStore.getState().removeOrder(oid);
        }
      } catch (error) {
        console.error(`[OrderQueryService] Failed to fetch order ${oid}:`, error);
        // Keep existing order data if fetch fails
      }
    }
  }
}
