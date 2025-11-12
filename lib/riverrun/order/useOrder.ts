import * as hl from '@nktkas/hyperliquid';
import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { roundPrice } from '@/components/trade/priceUtils';
import { getBuilderParam, useBuilderFee, useMarketStore } from '@/core/composition';
import { useHyperliquidClient } from '@/core/infra/hyperliquid/client/useHyperliquidClient';

/**
 * Validate that a size string has the correct number of decimal places
 * @param size - Size as string (e.g., "0.123")
 * @param maxDecimals - Maximum allowed decimal places (szDecimals)
 * @throws Error if size has more decimals than allowed
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
 * Parameters for opening a market order
 */
export interface MarketOrderParams {
  coin: string;
  side: 'Long' | 'Short';
  size: string;
  reduceOnly?: boolean;
  marketPrice: number; // For calculating extreme price
}

/**
 * Parameters for opening a limit order
 */
export interface LimitOrderParams {
  coin: string;
  side: 'Long' | 'Short';
  size: string;
  limitPrice: string;
  reduceOnly?: boolean;
}

/**
 * Parameters for closing a position with market order
 */
export interface CloseMarketOrderParams {
  coin: string; // Asset symbol (e.g., 'BTC', 'ETH')
  side: 'Long' | 'Short'; // Order side: Long = buy (close short), Short = sell (close long)
  size: string; // Size to close (must match asset's decimal precision)
  marketPrice: string; // Current market price for extreme price calculation
}

/**
 * Parameters for closing a position with limit order
 */
export interface CloseLimitOrderParams {
  coin: string; // Asset symbol (e.g., 'BTC', 'ETH')
  side: 'Long' | 'Short'; // Order side: Long = buy (close short), Short = sell (close long)
  size: string; // Size to close
  price: string; // Limit price
}

/**
 * Parameters for canceling an order
 */
export interface CancelOrderParams {
  coin: string;
  orderId: number;
}

/**
 * Parameters for canceling multiple orders
 */
export interface CancelOrdersParams {
  orders: Array<{ coin: string; orderId: number }>;
}

/**
 * Parameters for placing TP/SL orders on a position
 */
export interface TpSlOrderParams {
  coin: string; // Asset symbol
  isLong: boolean; // Position direction
  size: string; // Order size (entire position or configured amount)
  // Take Profit parameters (optional)
  tpTriggerPrice?: string; // Trigger price for TP
  tpLimitPrice?: string; // Limit price for TP (if not provided, market order with 10% slippage)
  // Stop Loss parameters (optional)
  slTriggerPrice?: string; // Trigger price for SL
  slLimitPrice?: string; // Limit price for SL (if not provided, market order with 10% slippage)
}

/**
 * Unified order placement parameters
 * Supports all order types through optional fields with clear semantics
 */
export interface PlaceOrderParams {
  // Required fields
  coin: string;
  side: 'Long' | 'Short';
  size: string;

  // Order type configuration
  orderType: 'Market' | 'Limit';
  limitPrice?: string; // Required if orderType === 'Limit'
  marketPrice?: number; // Required if orderType === 'Market'

  // Order behavior
  reduceOnly?: boolean;

  // TP/SL configuration (optional)
  tpSl?: {
    tpTriggerPrice?: string;
    tpLimitPrice?: string; // If omitted, TP executes as market order
    slTriggerPrice?: string;
    slLimitPrice?: string; // If omitted, SL executes as market order
  };
}

/**
 * Result type for the useOrder hook
 */
export interface UseOrderResult {
  // Unified order placement
  placeOrder: (params: PlaceOrderParams) => Promise<boolean>;

  // Other order operations
  placeCloseMarketOrder: (params: CloseMarketOrderParams) => Promise<boolean>;
  placeCloseLimitOrder: (params: CloseLimitOrderParams) => Promise<boolean>;
  placeTpSlOrders: (params: TpSlOrderParams) => Promise<boolean>;

  // Order cancellation methods
  cancelOrder: (params: CancelOrderParams) => Promise<boolean>;
  cancelOrders: (params: CancelOrdersParams) => Promise<boolean>;

  // State
  isPlacingOrder: boolean;
  isCanceling: boolean;
  error: string | null;
}

/**
 * Unified hook for placing and canceling orders on Hyperliquid
 *
 * Features:
 * - Handles agent approval flow internally
 * - Shows toast notifications for success/failure
 * - Returns boolean for caller to handle additional logic
 * - Manages loading states
 *
 * @example
 * ```tsx
 * const { placeMarketOrder, isPlacingOrder } = useOrder();
 *
 * const handleBuy = async () => {
 *   const success = await placeMarketOrder({
 *     coin: 'BTC',
 *     side: 'Long',
 *     size: '0.1',
 *     marketPrice: 50000,
 *   });
 *   if (success) {
 *     // Additional logic after successful order
 *   }
 * };
 * ```
 */

// ============================================================================
// Internal Helper Functions for Unified placeOrder Method
// ============================================================================

/**
 * Order context containing exchange client and asset metadata
 */
interface OrderContext {
  exchangeClient: hl.ExchangeClient;
  assetId: number;
  szDecimals: number;
}

/**
 * Get order context (exchange client + asset metadata)
 * Internal helper function - not exported
 */
async function getOrderContext(
  coin: string,
  getAgentExchangeClient: () => Promise<hl.ExchangeClient | null | undefined>,
  markets: Array<{ coin: string; assetId: number; szDecimals: number }>,
): Promise<OrderContext | null> {
  const exchangeClient = await getAgentExchangeClient();
  if (!exchangeClient) {
    return null;
  }

  // Get asset metadata from markets store (from metaAndAssetCtxs subscription)
  const market = markets.find(m => m.coin === coin);
  if (!market) {
    throw new Error(`Unable to find market data for ${coin}`);
  }

  const assetId = market.assetId;
  const szDecimals = market.szDecimals;

  return { exchangeClient, assetId, szDecimals };
}

/**
 * Build parent order (market or limit)
 * Internal helper function - not exported
 */
function buildParentOrder(params: PlaceOrderParams, context: OrderContext): any {
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
 * Internal helper function - not exported
 */
function buildTpSlOrders(params: PlaceOrderParams, context: OrderContext): any[] {
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

/**
 * Determine grouping strategy based on whether TP/SL is provided
 * Internal helper function - not exported
 */
function getGrouping(params: PlaceOrderParams): 'na' | 'normalTpsl' {
  return params.tpSl ? 'normalTpsl' : 'na';
}

/**
 * Build success message for toast notification
 * Internal helper function - not exported
 */
function buildSuccessMessage(params: PlaceOrderParams): { title: string; description: string } {
  const orderType = params.orderType;
  const base = `${orderType} ${params.side} order for ${params.size} ${params.coin}`;

  if (!params.tpSl) {
    // Simple order without TP/SL
    return {
      title: 'Order Placed',
      description: base,
    };
  }

  // Build TP/SL description
  const tpSlParts: string[] = [];
  if (params.tpSl.tpTriggerPrice) {
    tpSlParts.push(`TP @ ${params.tpSl.tpTriggerPrice}`);
  }
  if (params.tpSl.slTriggerPrice) {
    tpSlParts.push(`SL @ ${params.tpSl.slTriggerPrice}`);
  }

  return {
    title: 'Order Placed',
    description: `${base} with ${tpSlParts.join(', ')}`,
  };
}

// ============================================================================
// Main Hook
// ============================================================================

export function useOrder(): UseOrderResult {
  const { getAgentExchangeClient } = useHyperliquidClient();
  const { ensureBuilderFeeApproval } = useBuilderFee();
  const markets = useMarketStore(state => state.markets);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Close a position with market order
   *
   * Key differences from opening orders:
   * - Reduce-only is always set to true to prevent position flip
   * - Uses extreme price (±5%) for immediate execution
   */
  const placeCloseMarketOrder = useCallback(
    async (params: CloseMarketOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(null);

      try {
        // 1. Ensure builder fee is approved
        const isBuilderFeeApproved = await ensureBuilderFeeApproval();
        if (!isBuilderFeeApproved) {
          toast.info('Cancelled', {
            description: 'Builder fee approval was cancelled',
          });
          return false;
        }

        // 2. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 3. Get asset metadata from markets store (from metaAndAssetCtxs subscription)
        const market = markets.find(m => m.coin === params.coin);
        if (!market) {
          throw new Error(`Unable to find market data for ${params.coin}`);
        }

        const assetId = market.assetId;
        const szDecimals = market.szDecimals;

        // 4. Validate size decimals
        validateSizeDecimals(params.size, szDecimals, params.coin);

        // 5. Calculate extreme price for market order
        const isLong = params.side === 'Long';
        const marketPriceNum = parseFloat(params.marketPrice);
        const extremePrice = isLong
          ? marketPriceNum * 1.05 // Buy: 5% above market
          : marketPriceNum * 0.95; // Sell: 5% below market
        const price = roundPrice(extremePrice, szDecimals, false);

        // 6. Build order parameters
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: params.size, // Use size as-is after validation
          r: true, // Always reduce-only for close orders
          t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel
        };

        // 7. Execute order with builder fee
        const response = await exchangeClient.order({
          orders: [orderParams],
          grouping: 'na',
          builder: getBuilderParam(),
        });

        // 8. Check for errors in response
        if (response.response.data.statuses && response.response.data.statuses.length > 0) {
          const status = response.response.data.statuses[0];
          if ('error' in status && typeof status.error === 'string') {
            toast.error('Order Failed', {
              description: status.error,
            });
            setError(status.error);
            return false;
          }
        }

        // 9. Success
        toast.success('Market Close Order Placed', {
          description: `Market close for ${params.size} ${params.coin}`,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.placeCloseMarketOrder] Error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to place market close order';
        setError(errorMessage);
        toast.error('Market Close Order Failed', {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [ensureBuilderFeeApproval, getAgentExchangeClient, markets],
  );

  /**
   * Close a position with limit order
   *
   * Key differences from opening orders:
   * - Reduce-only is always set to true to prevent position flip
   * - Uses user-specified price
   */
  const placeCloseLimitOrder = useCallback(
    async (params: CloseLimitOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(null);

      try {
        // 1. Ensure builder fee is approved
        const isBuilderFeeApproved = await ensureBuilderFeeApproval();
        if (!isBuilderFeeApproved) {
          toast.info('Cancelled', {
            description: 'Builder fee approval was cancelled',
          });
          return false;
        }

        // 2. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 3. Get asset metadata from markets store (from metaAndAssetCtxs subscription)
        const market = markets.find(m => m.coin === params.coin);
        if (!market) {
          throw new Error(`Unable to find market data for ${params.coin}`);
        }

        const assetId = market.assetId;
        const szDecimals = market.szDecimals;

        // 4. Validate size decimals
        validateSizeDecimals(params.size, szDecimals, params.coin);

        // 5. Use user-specified price
        const price = params.price;

        // 6. Build order parameters
        const isLong = params.side === 'Long';
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: params.size, // Use size as-is after validation
          r: true, // Always reduce-only for close orders
          t: { limit: { tif: 'Gtc' as const } }, // Good-Till-Cancel
        };

        // 7. Execute order with builder fee
        const response = await exchangeClient.order({
          orders: [orderParams],
          grouping: 'na',
          builder: getBuilderParam(),
        });

        // 8. Check for errors in response
        if (response.response.data.statuses && response.response.data.statuses.length > 0) {
          const status = response.response.data.statuses[0];
          if ('error' in status && typeof status.error === 'string') {
            toast.error('Order Failed', {
              description: status.error,
            });
            setError(status.error);
            return false;
          }
        }

        // 9. Success
        toast.success('Limit Close Order Placed', {
          description: `Limit close for ${params.size} ${params.coin} @ ${price}`,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.placeCloseLimitOrder] Error:', err);
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to place limit close order';
        setError(errorMessage);
        toast.error('Limit Close Order Failed', {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [ensureBuilderFeeApproval, getAgentExchangeClient, markets],
  );

  /**
   * Cancel a single order
   */
  const cancelOrder = useCallback(
    async (params: CancelOrderParams): Promise<boolean> => {
      setIsCanceling(true);
      setError(null);

      try {
        // 1. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order cancellation was cancelled',
          });
          return false;
        }

        // 2. Get asset metadata from markets store (from metaAndAssetCtxs subscription)
        const market = markets.find(m => m.coin === params.coin);
        if (!market) {
          throw new Error(`Unable to find market data for ${params.coin}`);
        }

        const assetId = market.assetId;

        // 3. Execute cancellation
        await exchangeClient.cancel({
          cancels: [
            {
              a: assetId,
              o: params.orderId,
            },
          ],
        });

        // 4. Success
        toast.success('Order Cancelled', {
          description: `Successfully cancelled order for ${params.coin}`,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.cancelOrder] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel order';
        setError(errorMessage);
        toast.error('Cancellation Failed', {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsCanceling(false);
      }
    },
    [getAgentExchangeClient, markets],
  );

  /**
   * Cancel multiple orders in a single transaction
   */
  const cancelOrders = useCallback(
    async (params: CancelOrdersParams): Promise<boolean> => {
      setIsCanceling(true);
      setError(null);

      try {
        // 1. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order cancellation was cancelled',
          });
          return false;
        }

        // 2. Build cancels array using markets data
        const cancels = params.orders
          .map(order => {
            const market = markets.find(m => m.coin === order.coin);
            if (!market) {
              console.error(`Unable to find market data for ${order.coin}`);
              return null;
            }
            return {
              a: market.assetId,
              o: order.orderId,
            };
          })
          .filter((cancel): cancel is { a: number; o: number } => cancel !== null);

        // Validation
        if (cancels.length === 0) {
          throw new Error('No valid orders to cancel');
        }

        // 4. Execute cancellation
        await exchangeClient.cancel({ cancels });

        // 5. Success
        toast.success('Orders Cancelled', {
          description: `Successfully cancelled ${cancels.length} order${cancels.length > 1 ? 's' : ''}`,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.cancelOrders] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to cancel orders';
        setError(errorMessage);
        toast.error('Cancellation Failed', {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsCanceling(false);
      }
    },
    [getAgentExchangeClient, markets],
  );

  /**
   * Place TP/SL orders for a position
   *
   * Creates trigger orders that automatically close a position when profit/loss targets are reached.
   * - TP/SL orders are reduce-only by default
   * - Market TP/SL have 10% slippage tolerance
   * - Limit TP/SL allow precise control over execution price
   * - Uses "positionTpsl" grouping for position-linked TP/SL
   */
  const placeTpSlOrders = useCallback(
    async (params: TpSlOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(null);

      try {
        // 1. Ensure builder fee is approved
        const isBuilderFeeApproved = await ensureBuilderFeeApproval();
        if (!isBuilderFeeApproved) {
          toast.info('Cancelled', {
            description: 'Builder fee approval was cancelled',
          });
          return false;
        }

        // 2. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 3. Get asset metadata from markets store (from metaAndAssetCtxs subscription)
        const market = markets.find(m => m.coin === params.coin);
        if (!market) {
          throw new Error(`Unable to find market data for ${params.coin}`);
        }

        const assetId = market.assetId;
        const szDecimals = market.szDecimals;

        // Validate at least one TP or SL is provided
        if (!params.tpTriggerPrice && !params.slTriggerPrice) {
          throw new Error('At least one of TP or SL must be provided');
        }

        // 4. Validate size decimals
        validateSizeDecimals(params.size, szDecimals, params.coin);

        // 5. Build TP/SL orders
        const orders: any[] = [];

        // Take Profit order (close long = sell, close short = buy)
        if (params.tpTriggerPrice) {
          const tpIsBuy = !params.isLong; // TP for long = sell, TP for short = buy
          const tpOrder = {
            a: assetId,
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
            a: assetId,
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
        const response = await exchangeClient.order({
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
            toast.error('TP/SL Order Failed', {
              description: errors.join(', '),
            });
            setError(errors.join(', '));
            return false;
          }
        }

        // 8. Success
        const orderDescriptions = [];
        if (params.tpTriggerPrice) {
          orderDescriptions.push(
            `TP @ ${params.tpTriggerPrice}${params.tpLimitPrice ? ` (limit: ${params.tpLimitPrice})` : ' (market)'}`,
          );
        }
        if (params.slTriggerPrice) {
          orderDescriptions.push(
            `SL @ ${params.slTriggerPrice}${params.slLimitPrice ? ` (limit: ${params.slLimitPrice})` : ' (market)'}`,
          );
        }

        toast.success('TP/SL Orders Placed', {
          description: orderDescriptions.join(', '),
        });
        return true;
      } catch (err) {
        console.error('[useOrder.placeTpSlOrders] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to place TP/SL orders';
        setError(errorMessage);
        toast.error('TP/SL Order Failed', {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [ensureBuilderFeeApproval, getAgentExchangeClient, markets],
  );

  /**
   * Unified order placement method
   * Handles all order types: Market, Limit, with/without TP/SL
   */
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(null);

      try {
        // 1. Validate parameters
        if (params.orderType === 'Market' && !params.marketPrice) {
          throw new Error('Market price is required for market orders');
        }
        if (params.orderType === 'Limit' && !params.limitPrice) {
          throw new Error('Limit price is required for limit orders');
        }
        if (params.tpSl && !params.tpSl.tpTriggerPrice && !params.tpSl.slTriggerPrice) {
          throw new Error('At least one of TP or SL must be provided when tpSl is enabled');
        }

        // 2. Ensure builder fee is approved
        const isBuilderFeeApproved = await ensureBuilderFeeApproval();
        if (!isBuilderFeeApproved) {
          toast.info('Cancelled', {
            description: 'Builder fee approval was cancelled',
          });
          return false;
        }

        // 3. Get order context (client, asset metadata)
        const context = await getOrderContext(params.coin, getAgentExchangeClient, markets);
        if (!context) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 4. Validate size decimals
        validateSizeDecimals(params.size, context.szDecimals, params.coin);

        // 5. Build orders array
        const orders: any[] = [];

        // Parent order (always present)
        orders.push(buildParentOrder(params, context));

        // TP/SL orders (if provided)
        const tpSlOrders = buildTpSlOrders(params, context);
        orders.push(...tpSlOrders);

        // 6. Determine grouping strategy
        const grouping = getGrouping(params);

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
            const errorMsg = errors.join(', ');
            toast.error('Order Failed', {
              description: errorMsg,
            });
            setError(errorMsg);
            return false;
          }
        }

        // 9. Success
        const successMessage = buildSuccessMessage(params);
        toast.success(successMessage.title, {
          description: successMessage.description,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.placeOrder] Error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Failed to place order';
        setError(errorMessage);
        toast.error('Order Failed', {
          description: errorMessage,
        });
        return false;
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [ensureBuilderFeeApproval, getAgentExchangeClient, markets],
  );

  return {
    placeOrder,
    placeCloseMarketOrder,
    placeCloseLimitOrder,
    placeTpSlOrders,
    cancelOrder,
    cancelOrders,
    isPlacingOrder,
    isCanceling,
    error,
  };
}
