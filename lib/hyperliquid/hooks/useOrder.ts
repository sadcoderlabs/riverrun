import * as hl from '@nktkas/hyperliquid';
import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { roundPrice } from '@/components/trade/price-utils';
import { useHyperliquidClient } from './useHyperliquidClient';

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
  size: string; // Size to close
  marketPrice: number; // Current market price for extreme price calculation
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
 * Result type for the useOrder hook
 */
export interface UseOrderResult {
  // Order placement methods
  placeMarketOrder: (params: MarketOrderParams) => Promise<boolean>;
  placeLimitOrder: (params: LimitOrderParams) => Promise<boolean>;
  placeCloseMarketOrder: (params: CloseMarketOrderParams) => Promise<boolean>;
  placeCloseLimitOrder: (params: CloseLimitOrderParams) => Promise<boolean>;
  cancelOrder: (params: CancelOrderParams) => Promise<boolean>;

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

        // 3. Calculate extreme price for market order
        const isLong = params.side === 'Long';
        const extremePrice = isLong
          ? params.marketPrice * 1.05 // Buy: 5% above market
          : params.marketPrice * 0.95; // Sell: 5% below market
        const price = roundPrice(extremePrice, szDecimals, false);

        // 4. Round size to asset-specific decimals
        const roundedSize = parseFloat(params.size).toFixed(szDecimals);

        // 5. Build order parameters
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: roundedSize,
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

        // 3. Use user-specified price
        const price = params.price;

        // 4. Round size to asset-specific decimals
        const roundedSize = parseFloat(params.size).toFixed(szDecimals);

        // 5. Build order parameters
        const isLong = params.side === 'Long';
        const orderParams = {
          a: assetId,
          b: isLong,
          p: price,
          s: roundedSize,
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
   * Cancel an open order
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

  return {
    placeMarketOrder,
    placeLimitOrder,
    placeCloseMarketOrder,
    placeCloseLimitOrder,
    cancelOrder,
    isPlacingOrder,
    isCanceling,
    error,
  };
}
