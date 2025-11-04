import * as hl from '@nktkas/hyperliquid';
import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { roundPrice } from '@/components/trade/price-utils';
import { useHyperliquidClient } from './useHyperliquidClient';

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
 * Result type for the useOrder hook
 */
export interface UseOrderResult {
  // Order placement methods
  placeMarketOrder: (params: MarketOrderParams) => Promise<boolean>;
  placeLimitOrder: (params: LimitOrderParams) => Promise<boolean>;
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
export function useOrder(): UseOrderResult {
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Place a market order
   */
  const placeMarketOrder = useCallback(
    async (params: MarketOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(null);

      try {
        // 1. Get agent exchange client (handles approval flow)
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 2. Get asset metadata
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(params.coin);
        const szDecimals = converter.getSzDecimals(params.coin);

        // Validation
        if (assetId === undefined) {
          throw new Error(`Unable to find asset ID for ${params.coin}`);
        }
        if (szDecimals === undefined) {
          throw new Error(`Unable to find size decimals for ${params.coin}`);
        }

        // 3. Calculate extreme price for market order (±5% to ensure immediate execution)
        const isLong = params.side === 'Long';
        const extremePrice = isLong
          ? params.marketPrice * 1.05 // 5% above market for buys
          : params.marketPrice * 0.95; // 5% below market for sells
        const price = roundPrice(extremePrice, szDecimals, false);

        // 4. Round size to asset-specific decimals
        const roundedSize = parseFloat(params.size).toFixed(szDecimals);

        // 5. Build order parameters
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: roundedSize,
          r: params.reduceOnly ?? false,
          t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel for market orders
        };

        // 6. Execute order
        const response = await exchangeClient.order({
          orders: [orderParams],
          grouping: 'na',
        });

        // 7. Check for errors in response
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

        // 8. Success
        toast.success('Order Placed', {
          description: `Market ${params.side} order for ${params.size} ${params.coin}`,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.placeMarketOrder] Error:', err);
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
    [getAgentExchangeClient, getSymbolConverter],
  );

  /**
   * Place a limit order
   */
  const placeLimitOrder = useCallback(
    async (params: LimitOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(null);

      try {
        // 1. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 2. Get asset metadata
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(params.coin);
        const szDecimals = converter.getSzDecimals(params.coin);

        // Validation
        if (assetId === undefined) {
          throw new Error(`Unable to find asset ID for ${params.coin}`);
        }
        if (szDecimals === undefined) {
          throw new Error(`Unable to find size decimals for ${params.coin}`);
        }

        // 3. Use user-specified price (no rounding for limit orders)
        const price = params.limitPrice;

        // 4. Round size to asset-specific decimals
        const roundedSize = parseFloat(params.size).toFixed(szDecimals);

        // 5. Build order parameters
        const isLong = params.side === 'Long';
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: roundedSize,
          r: params.reduceOnly ?? false,
          t: { limit: { tif: 'Gtc' as const } }, // Good-Till-Cancel for limit orders
        };

        // 6. Execute order
        const response = await exchangeClient.order({
          orders: [orderParams],
          grouping: 'na',
        });

        // 7. Check for errors in response
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

        // 8. Success
        toast.success('Order Placed', {
          description: `Limit ${params.side} order for ${params.size} ${params.coin} @ ${price}`,
        });
        return true;
      } catch (err) {
        console.error('[useOrder.placeLimitOrder] Error:', err);
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
    [getAgentExchangeClient, getSymbolConverter],
  );

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
        // 1. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 2. Get asset metadata
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(params.coin);
        const szDecimals = converter.getSzDecimals(params.coin);

        // Validation
        if (assetId === undefined) {
          throw new Error(`Unable to find asset ID for ${params.coin}`);
        }
        if (szDecimals === undefined) {
          throw new Error(`Unable to find size decimals for ${params.coin}`);
        }

        // 3. Validate size decimals
        validateSizeDecimals(params.size, szDecimals, params.coin);

        // 4. Calculate extreme price for market order
        const isLong = params.side === 'Long';
        const marketPriceNum = parseFloat(params.marketPrice);
        const extremePrice = isLong
          ? marketPriceNum * 1.05 // Buy: 5% above market
          : marketPriceNum * 0.95; // Sell: 5% below market
        const price = roundPrice(extremePrice, szDecimals, false);

        // 5. Build order parameters
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: params.size, // Use size as-is after validation
          r: true, // Always reduce-only for close orders
          t: { limit: { tif: 'Ioc' as const } }, // Immediate-Or-Cancel
        };

        // 6. Execute order
        const response = await exchangeClient.order({
          orders: [orderParams],
          grouping: 'na',
        });

        // 7. Check for errors in response
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

        // 8. Success
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
    [getAgentExchangeClient, getSymbolConverter],
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
        // 1. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 2. Get asset metadata
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(params.coin);
        const szDecimals = converter.getSzDecimals(params.coin);

        // Validation
        if (assetId === undefined) {
          throw new Error(`Unable to find asset ID for ${params.coin}`);
        }
        if (szDecimals === undefined) {
          throw new Error(`Unable to find size decimals for ${params.coin}`);
        }

        // 3. Validate size decimals
        validateSizeDecimals(params.size, szDecimals, params.coin);

        // 4. Use user-specified price
        const price = params.price;

        // 5. Build order parameters
        const isLong = params.side === 'Long';
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: params.size, // Use size as-is after validation
          r: true, // Always reduce-only for close orders
          t: { limit: { tif: 'Gtc' as const } }, // Good-Till-Cancel
        };

        // 6. Execute order
        const response = await exchangeClient.order({
          orders: [orderParams],
          grouping: 'na',
        });

        // 7. Check for errors in response
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

        // 8. Success
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
    [getAgentExchangeClient, getSymbolConverter],
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

        // 2. Get asset metadata
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(params.coin);

        // Validation
        if (assetId === undefined) {
          throw new Error(`Unable to find asset ID for ${params.coin}`);
        }

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
    [getAgentExchangeClient, getSymbolConverter],
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

        // 2. Get asset metadata
        const converter = await getSymbolConverter();

        // 3. Build cancels array
        const cancels = params.orders
          .map(order => {
            const assetId = converter.getAssetId(order.coin);
            if (assetId === undefined) {
              console.error(`Unable to find asset ID for ${order.coin}`);
              return null;
            }
            return {
              a: assetId,
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
    [getAgentExchangeClient, getSymbolConverter],
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
        // 1. Get agent exchange client
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          toast.info('Cancelled', {
            description: 'Order placement was cancelled',
          });
          return false;
        }

        // 2. Get asset metadata
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(params.coin);
        const szDecimals = converter.getSzDecimals(params.coin);

        // Validation
        if (assetId === undefined) {
          throw new Error(`Unable to find asset ID for ${params.coin}`);
        }
        if (szDecimals === undefined) {
          throw new Error(`Unable to find size decimals for ${params.coin}`);
        }

        // Validate at least one TP or SL is provided
        if (!params.tpTriggerPrice && !params.slTriggerPrice) {
          throw new Error('At least one of TP or SL must be provided');
        }

        // 3. Validate size decimals
        validateSizeDecimals(params.size, szDecimals, params.coin);

        // 4. Build TP/SL orders
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

        // 5. Execute orders with positionTpsl grouping
        const response = await exchangeClient.order({
          orders,
          grouping: 'positionTpsl',
        });

        // 6. Check for errors in response
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

        // 7. Success
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
    [getAgentExchangeClient, getSymbolConverter],
  );

  return {
    placeMarketOrder,
    placeLimitOrder,
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
