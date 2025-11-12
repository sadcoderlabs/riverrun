/**
 * Order Service - Business logic for order operations
 *
 * This service implements the OrderPort interface and provides:
 * - Autonomous lifecycle management (monitors wallet changes)
 * - Open orders subscription (HTTP + WebSocket hybrid)
 * - Order placement operations (Market, Limit, TP/SL)
 * - Order cancellation operations
 *
 * Design: Autonomous Service Pattern
 * - Automatically monitors active wallet changes
 * - Manages subscription lifecycle internally
 * - Returns Result objects instead of throwing errors
 * - No margin validation (UI layer responsibility)
 */

import { roundPrice } from '@/components/trade/priceUtils';
import type { AgentPort } from '@/core/contexts/agent/ports/agentPort';
import { getBuilderParam } from '@/core/contexts/builderFee/config';
import type { BuilderFeePort } from '@/core/contexts/builderFee/ports/builderFeePort';
import type { MarketPort } from '@/core/contexts/market/ports/marketPort';
import { activeWalletStore } from '@/core/contexts/wallet/adapters/activeWalletStore';
import type {
  HyperliquidGateway,
  SubscriptionHandle,
} from '@/core/infra/hyperliquid/hyperliquidGateway';
import * as hl from '@nktkas/hyperliquid';
import { orderStore } from '../adapters/orderStore';
import type {
  CancelOrderParams,
  CancelOrdersParams,
  CloseLimitOrderParams,
  CloseMarketOrderParams,
  Order,
  OrderPort,
  OrderResult,
  PlaceOrderParams,
  TpSlOrderParams,
} from '../ports';

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
// Helper Functions
// ============================================================================

/**
 * Validate that a size string has the correct number of decimal places
 */
function validateSizeDecimals(size: string, maxDecimals: number, coin: string): void {
  const parts = size.split('.');
  if (parts.length > 2) {
    throw new Error(`Invalid size format for ${coin}: ${size}`);
  }
  if (parts.length === 2) {
    const decimalPlaces = parts[1].length;
    if (decimalPlaces > maxDecimals) {
      throw new Error(
        `Size for ${coin} has too many decimal places. Maximum allowed: ${maxDecimals}, got: ${decimalPlaces}`,
      );
    }
  }
}

/**
 * Order context containing exchange client and asset metadata
 */
interface OrderContext {
  exchangeClient: hl.ExchangeClient;
  assetId: number;
  szDecimals: number;
}

// ============================================================================
// Order Service Implementation
// ============================================================================

export class OrderService implements OrderPort {
  // Subscription management
  private ordersSubscription: SubscriptionHandle | undefined;
  private walletUnsubscribe: (() => void) | undefined;
  private currentUserAddress: string | undefined;

  constructor(
    private readonly agentPort: AgentPort,
    private readonly builderFeePort: BuilderFeePort,
    private readonly marketPort: MarketPort,
    private readonly hyperliquidGateway: HyperliquidGateway,
  ) {}

  // ==========================================================================
  // Lifecycle Management
  // ==========================================================================

  /**
   * Start the Order Service
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
   * Stop the Order Service
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

    this.currentUserAddress = userAddress;
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
      console.error('[OrderService] Failed to start subscription:', error);
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

    this.currentUserAddress = undefined;
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
        console.error(`[OrderService] Failed to fetch order ${oid}:`, error);
        // Keep existing order data if fetch fails
      }
    }
  }

  // ==========================================================================
  // Helper Methods (Private)
  // ==========================================================================

  /**
   * Get order context (exchange client + asset metadata)
   */
  private async getOrderContext(coin: string): Promise<OrderContext | undefined> {
    // Get agent exchange client
    const exchangeClient = await this.agentPort.getExchangeClient();
    if (!exchangeClient) {
      return undefined;
    }

    // Get asset metadata from market service
    const market = this.marketPort.getMarketByCoin(coin);
    if (!market) {
      throw new Error(`Unable to find market data for ${coin}`);
    }

    return {
      exchangeClient,
      assetId: market.assetId,
      szDecimals: market.szDecimals,
    };
  }

  /**
   * Build parent order (market or limit)
   */
  private buildParentOrder(params: PlaceOrderParams, context: OrderContext): any {
    const isLong = params.side === 'Long';
    const roundedSize = parseFloat(params.size).toFixed(context.szDecimals);

    if (params.orderType === 'Market') {
      // Market order: use extreme price (±5% to ensure immediate execution)
      const extremePrice = isLong
        ? params.marketPrice! * 1.05 // 5% above market for buys
        : params.marketPrice! * 0.95; // 5% below market for sells
      const price = roundPrice(extremePrice, context.szDecimals, false);

      return {
        a: context.assetId,
        b: isLong,
        p: price,
        s: roundedSize,
        r: params.reduceOnly ?? false,
        t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel
      };
    } else {
      // Limit order
      return {
        a: context.assetId,
        b: isLong,
        p: params.limitPrice!,
        s: roundedSize,
        r: params.reduceOnly ?? false,
        t: { limit: { tif: 'Gtc' as const } }, // Good-Til-Cancel
      };
    }
  }

  /**
   * Build TP/SL child orders
   */
  private buildTpSlOrders(params: PlaceOrderParams, context: OrderContext): any[] {
    if (!params.tpSl) {
      return [];
    }

    const orders: any[] = [];
    const isLong = params.side === 'Long';
    const roundedSize = parseFloat(params.size).toFixed(context.szDecimals);

    // Build TP order if provided
    if (params.tpSl.tpTriggerPrice) {
      orders.push({
        a: context.assetId,
        b: !isLong, // Close position
        p: params.tpSl.tpLimitPrice || params.tpSl.tpTriggerPrice,
        s: roundedSize,
        r: true, // Reduce-only
        t: {
          trigger: {
            isMarket: !params.tpSl.tpLimitPrice, // Market if no limit price
            triggerPx: params.tpSl.tpTriggerPrice,
            tpsl: 'tp' as const,
          },
        },
      });
    }

    // Build SL order if provided
    if (params.tpSl.slTriggerPrice) {
      orders.push({
        a: context.assetId,
        b: !isLong, // Close position
        p: params.tpSl.slLimitPrice || params.tpSl.slTriggerPrice,
        s: roundedSize,
        r: true, // Reduce-only
        t: {
          trigger: {
            isMarket: !params.tpSl.slLimitPrice, // Market if no limit price
            triggerPx: params.tpSl.slTriggerPrice,
            tpsl: 'sl' as const,
          },
        },
      });
    }

    return orders;
  }

  // ==========================================================================
  // Order Placement Operations
  // ==========================================================================

  /**
   * Place a unified order (Market or Limit with optional TP/SL)
   */
  async placeOrder(params: PlaceOrderParams): Promise<OrderResult> {
    try {
      // 1. Validate parameters
      if (params.orderType === 'Market' && !params.marketPrice) {
        return { success: false, error: 'Market price is required for market orders' };
      }
      if (params.orderType === 'Limit' && !params.limitPrice) {
        return { success: false, error: 'Limit price is required for limit orders' };
      }
      if (params.tpSl && !params.tpSl.tpTriggerPrice && !params.tpSl.slTriggerPrice) {
        return {
          success: false,
          error: 'At least one of TP or SL must be provided when tpSl is enabled',
        };
      }

      // 2. Ensure builder fee is approved
      const builderFeeApproved = await this.builderFeePort.ensureApproval();
      if (!builderFeeApproved) {
        return { success: false, error: 'Builder fee approval was cancelled' };
      }

      // 3. Get order context (client, asset metadata)
      const context = await this.getOrderContext(params.coin);
      if (!context) {
        return { success: false, error: 'Order placement was cancelled' };
      }

      // 4. Validate size decimals
      validateSizeDecimals(params.size, context.szDecimals, params.coin);

      // 5. Build orders array
      const orders: any[] = [];

      // Parent order (always present)
      orders.push(this.buildParentOrder(params, context));

      // TP/SL orders (if provided)
      const tpSlOrders = this.buildTpSlOrders(params, context);
      orders.push(...tpSlOrders);

      // 6. Determine grouping strategy
      const grouping = params.tpSl ? 'normalTpsl' : 'na';

      // 7. Execute order with builder fee
      const response = await context.exchangeClient.order({
        orders,
        grouping,
        builder: getBuilderParam(),
      });

      // 8. Handle response errors
      if (response.response.data.statuses && response.response.data.statuses.length > 0) {
        const errors = response.response.data.statuses
          .filter(
            status =>
              status !== null &&
              typeof status === 'object' &&
              'error' in status &&
              typeof status.error === 'string',
          )
          .map(status => (status as any).error);

        if (errors.length > 0) {
          return { success: false, error: errors.join(', ') };
        }
      }

      // 9. Success
      return { success: true };
    } catch (err) {
      console.error('[OrderService.placeOrder] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to place order',
      };
    }
  }

  /**
   * Close a position with a market order
   */
  async placeCloseMarketOrder(params: CloseMarketOrderParams): Promise<OrderResult> {
    try {
      // 1. Ensure builder fee is approved
      const builderFeeApproved = await this.builderFeePort.ensureApproval();
      if (!builderFeeApproved) {
        return { success: false, error: 'Builder fee approval was cancelled' };
      }

      // 2. Get order context
      const context = await this.getOrderContext(params.coin);
      if (!context) {
        return { success: false, error: 'Order placement was cancelled' };
      }

      // 3. Validate size decimals
      validateSizeDecimals(params.size, context.szDecimals, params.coin);

      // 4. Calculate extreme price for market order
      const isLong = params.side === 'Long';
      const marketPriceNum = parseFloat(params.marketPrice);
      const extremePrice = isLong
        ? marketPriceNum * 1.05 // Buy: 5% above market
        : marketPriceNum * 0.95; // Sell: 5% below market
      const price = roundPrice(extremePrice, context.szDecimals, false);

      // 5. Build order parameters
      const orderParams = {
        a: context.assetId,
        b: isLong,
        p: price,
        s: params.size,
        r: true, // Always reduce-only for close orders
        t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel
      };

      // 6. Execute order with builder fee
      const response = await context.exchangeClient.order({
        orders: [orderParams],
        grouping: 'na',
        builder: getBuilderParam(),
      });

      // 7. Check for errors in response
      if (response.response.data.statuses && response.response.data.statuses.length > 0) {
        const status = response.response.data.statuses[0];
        if ('error' in status && typeof status.error === 'string') {
          return { success: false, error: status.error };
        }
      }

      // 8. Success
      return { success: true };
    } catch (err) {
      console.error('[OrderService.placeCloseMarketOrder] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to place market close order',
      };
    }
  }

  /**
   * Close a position with a limit order
   */
  async placeCloseLimitOrder(params: CloseLimitOrderParams): Promise<OrderResult> {
    try {
      // 1. Ensure builder fee is approved
      const builderFeeApproved = await this.builderFeePort.ensureApproval();
      if (!builderFeeApproved) {
        return { success: false, error: 'Builder fee approval was cancelled' };
      }

      // 2. Get order context
      const context = await this.getOrderContext(params.coin);
      if (!context) {
        return { success: false, error: 'Order placement was cancelled' };
      }

      // 3. Validate size decimals
      validateSizeDecimals(params.size, context.szDecimals, params.coin);

      // 4. Build order parameters
      const isLong = params.side === 'Long';
      const orderParams = {
        a: context.assetId,
        b: isLong,
        p: params.price,
        s: params.size,
        r: true, // Always reduce-only for close orders
        t: { limit: { tif: 'Gtc' as const } }, // Good-Till-Cancel
      };

      // 5. Execute order with builder fee
      const response = await context.exchangeClient.order({
        orders: [orderParams],
        grouping: 'na',
        builder: getBuilderParam(),
      });

      // 6. Check for errors in response
      if (response.response.data.statuses && response.response.data.statuses.length > 0) {
        const status = response.response.data.statuses[0];
        if ('error' in status && typeof status.error === 'string') {
          return { success: false, error: status.error };
        }
      }

      // 7. Success
      return { success: true };
    } catch (err) {
      console.error('[OrderService.placeCloseLimitOrder] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to place limit close order',
      };
    }
  }

  /**
   * Place TP/SL orders on an existing position
   */
  async placeTpSlOrders(params: TpSlOrderParams): Promise<OrderResult> {
    try {
      // 1. Validate at least one TP or SL is provided
      if (!params.tpTriggerPrice && !params.slTriggerPrice) {
        return { success: false, error: 'At least one of TP or SL must be provided' };
      }

      // 2. Ensure builder fee is approved
      const builderFeeApproved = await this.builderFeePort.ensureApproval();
      if (!builderFeeApproved) {
        return { success: false, error: 'Builder fee approval was cancelled' };
      }

      // 3. Get order context
      const context = await this.getOrderContext(params.coin);
      if (!context) {
        return { success: false, error: 'Order placement was cancelled' };
      }

      // 4. Validate size decimals
      validateSizeDecimals(params.size, context.szDecimals, params.coin);

      // 5. Build TP/SL orders
      const orders: any[] = [];

      // Take Profit order (close long = sell, close short = buy)
      if (params.tpTriggerPrice) {
        const tpIsBuy = !params.isLong; // TP for long = sell, TP for short = buy
        const tpOrder = {
          a: context.assetId,
          b: tpIsBuy,
          p: params.tpLimitPrice || params.tpTriggerPrice, // Use limit price or trigger price
          s: params.size,
          r: true, // Reduce-only
          t: {
            trigger: {
              isMarket: !params.tpLimitPrice, // Market if no limit price
              triggerPx: params.tpTriggerPrice,
              tpsl: 'tp' as const,
            },
          },
        };
        orders.push(tpOrder);
      }

      // Stop Loss order (close long = sell, close short = buy)
      if (params.slTriggerPrice) {
        const slIsBuy = !params.isLong; // SL for long = sell, SL for short = buy
        const slOrder = {
          a: context.assetId,
          b: slIsBuy,
          p: params.slLimitPrice || params.slTriggerPrice, // Use limit price or trigger price
          s: params.size,
          r: true, // Reduce-only
          t: {
            trigger: {
              isMarket: !params.slLimitPrice, // Market if no limit price
              triggerPx: params.slTriggerPrice,
              tpsl: 'sl' as const,
            },
          },
        };
        orders.push(slOrder);
      }

      // 6. Execute orders with positionTpsl grouping and builder fee
      const response = await context.exchangeClient.order({
        orders,
        grouping: 'positionTpsl',
        builder: getBuilderParam(),
      });

      // 7. Check for errors in response
      if (response.response.data.statuses && response.response.data.statuses.length > 0) {
        const errors = response.response.data.statuses
          .filter(
            status =>
              status !== null &&
              typeof status === 'object' &&
              'error' in status &&
              typeof status.error === 'string',
          )
          .map(status => (status as any).error);

        if (errors.length > 0) {
          return { success: false, error: errors.join(', ') };
        }
      }

      // 8. Success
      return { success: true };
    } catch (err) {
      console.error('[OrderService.placeTpSlOrders] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to place TP/SL orders',
      };
    }
  }

  // ==========================================================================
  // Order Cancellation Operations
  // ==========================================================================

  /**
   * Cancel a single order
   */
  async cancelOrder(params: CancelOrderParams): Promise<OrderResult> {
    try {
      // 1. Get agent exchange client
      const exchangeClient = await this.agentPort.getExchangeClient();
      if (!exchangeClient) {
        return { success: false, error: 'Order cancellation was cancelled' };
      }

      // 2. Get asset metadata
      const market = this.marketPort.getMarketByCoin(params.coin);
      if (!market) {
        return { success: false, error: `Unable to find market data for ${params.coin}` };
      }

      // 3. Execute cancellation
      await exchangeClient.cancel({
        cancels: [
          {
            a: market.assetId,
            o: params.orderId,
          },
        ],
      });

      // 4. Success
      return { success: true };
    } catch (err) {
      console.error('[OrderService.cancelOrder] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel order',
      };
    }
  }

  /**
   * Cancel multiple orders in batch
   */
  async cancelOrders(params: CancelOrdersParams): Promise<OrderResult> {
    try {
      // 1. Get agent exchange client
      const exchangeClient = await this.agentPort.getExchangeClient();
      if (!exchangeClient) {
        return { success: false, error: 'Order cancellation was cancelled' };
      }

      // 2. Build cancels array
      const cancels = params.orders
        .map(order => {
          const market = this.marketPort.getMarketByCoin(order.coin);
          if (!market) {
            console.error(`Unable to find market data for ${order.coin}`);
            return undefined;
          }
          return {
            a: market.assetId,
            o: order.orderId,
          };
        })
        .filter((cancel): cancel is { a: number; o: number } => cancel !== undefined);

      // Validation
      if (cancels.length === 0) {
        return { success: false, error: 'No valid orders to cancel' };
      }

      // 3. Execute cancellation
      await exchangeClient.cancel({ cancels });

      // 4. Success
      return { success: true };
    } catch (err) {
      console.error('[OrderService.cancelOrders] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel orders',
      };
    }
  }
}
