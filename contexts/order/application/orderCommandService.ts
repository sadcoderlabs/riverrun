/**
 * Order Command Service - Executes trading commands
 *
 * This service implements OrderCommandPort and is responsible for:
 * - Placing orders (Market, Limit, with optional TP/SL)
 * - Closing positions (Market or Limit)
 * - Managing TP/SL orders
 * - Canceling orders
 * - Parameter validation and order building
 * - Builder fee approval coordination
 *
 * Design: Command Service Pattern (CQRS)
 * - Stateless operations
 * - Returns Result objects instead of throwing errors
 * - Coordinates with other services for dependencies
 */

import { roundPrice } from '@/app-internal/components/trade/priceUtils';
import type { AgentPort } from '@/contexts/agent/ports/agentPort';
import { getBuilderParam } from '@/contexts/builderFee/config';
import type { BuilderFeePort } from '@/contexts/builderFee/ports/builderFeePort';
import type { MarketPort } from '@/contexts/market/ports/marketPort';
import type { HyperliquidGateway } from '@/infra/hyperliquid/hyperliquidGateway';
import * as hl from '@nktkas/hyperliquid';
import type { OrderCommandPort } from '../ports/orderCommandPort';
import type {
  CancelOrderParams,
  CancelOrdersParams,
  CloseLimitOrderParams,
  CloseMarketOrderParams,
  OrderResult,
  PlaceOrderParams,
  TpSlOrderParams,
} from '../ports/types';

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
// Order Command Service Implementation
// ============================================================================

export class OrderCommandService implements OrderCommandPort {
  constructor(
    private readonly agentPort: AgentPort,
    private readonly builderFeePort: BuilderFeePort,
    private readonly marketPort: MarketPort,
    private readonly hyperliquidGateway: HyperliquidGateway,
  ) {}

  // ==========================================================================
  // Helper Methods (Private)
  // ==========================================================================

  /**
   * Get order context (exchange client + asset metadata)
   */
  private async getOrderContext(coin: string): Promise<OrderContext | undefined> {
    // Get approved agent wallet
    const { agentWallet } = await this.agentPort.tryGetAgentWallet();
    if (!agentWallet) {
      return undefined;
    }

    // Create exchange client from agent wallet via gateway
    const exchangeClient = this.hyperliquidGateway.getAgentExchangeClient(agentWallet.signer);

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
      console.error('[OrderCommandService.placeOrder] Error:', err);
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
      console.error('[OrderCommandService.placeCloseMarketOrder] Error:', err);
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
      console.error('[OrderCommandService.placeCloseLimitOrder] Error:', err);
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
      console.error('[OrderCommandService.placeTpSlOrders] Error:', err);
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
      // 1. Get approved agent wallet
      const { agentWallet, errorReason } = await this.agentPort.tryGetAgentWallet();
      if (!agentWallet) {
        return {
          success: false,
          error: errorReason || 'Unable to get agent wallet for cancellation',
        };
      }

      // Create exchange client from agent wallet via gateway
      const exchangeClient = this.hyperliquidGateway.getAgentExchangeClient(agentWallet.signer);

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
      console.error('[OrderCommandService.cancelOrder] Error:', err);
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
      // 1. Get approved agent wallet
      const { agentWallet, errorReason } = await this.agentPort.tryGetAgentWallet();
      if (!agentWallet) {
        return {
          success: false,
          error: errorReason || 'Unable to get agent wallet for batch cancellation',
        };
      }

      // Create exchange client from agent wallet via gateway
      const exchangeClient = this.hyperliquidGateway.getAgentExchangeClient(agentWallet.signer);

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
      console.error('[OrderCommandService.cancelOrders] Error:', err);
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Failed to cancel orders',
      };
    }
  }
}
