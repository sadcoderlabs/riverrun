/**
 * useOrder - Business operations hook for orders
 *
 * Provides order placement and cancellation operations with UI integration:
 * - Loading states for UI feedback
 * - Toast notifications for success/failure
 * - Error state management
 * - Telemetry tracking for all order operations
 *
 * For state access (orders, isLoading), use useOrderStore instead for better performance.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { useContainer } from '@/app-internal/di';
import { useMarginStore } from '@/app-internal/features/margin/hooks/useMarginStore';
import type {
  PlaceOrderParams,
  CloseMarketOrderParams,
  CloseLimitOrderParams,
  TpSlOrderParams,
  CancelOrderParams,
  CancelOrdersParams,
} from '../../../../contexts/order/ports';

// ============================================================================
// Hook Result Interface
// ============================================================================

export interface UseOrderResult {
  // Business operations
  placeOrder: (params: PlaceOrderParams) => Promise<boolean>;
  placeCloseMarketOrder: (params: CloseMarketOrderParams) => Promise<boolean>;
  placeCloseLimitOrder: (params: CloseLimitOrderParams) => Promise<boolean>;
  placeTpSlOrders: (params: TpSlOrderParams) => Promise<boolean>;
  cancelOrder: (params: CancelOrderParams) => Promise<boolean>;
  cancelOrders: (params: CancelOrdersParams) => Promise<boolean>;

  // UI state only (not store state)
  isPlacingOrder: boolean;
  isCanceling: boolean;
  error: string | undefined;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build success message for toast notification
 */
function buildPlaceOrderSuccessMessage(params: PlaceOrderParams): {
  title: string;
  description: string;
} {
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

/**
 * Build success message for TP/SL orders
 */
function buildTpSlSuccessMessage(params: TpSlOrderParams): string {
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
  return orderDescriptions.join(', ');
}

// ============================================================================
// Main Hook
// ============================================================================

/**
 * useOrder - Order business operations hook
 *
 * For state access, use useOrderStore instead for better performance.
 *
 * @example
 * ```tsx
 * // State access (precise subscription)
 * const orders = useOrderStore(state => state.orders);
 * const isLoading = useOrderStore(state => state.isLoading);
 *
 * // Business operations
 * const { placeOrder, isPlacingOrder } = useOrder();
 *
 * const handleBuy = async () => {
 *   const success = await placeOrder({
 *     coin: 'BTC',
 *     side: 'Long',
 *     size: '0.1',
 *     orderType: 'Market',
 *     marketPrice: 50000,
 *   });
 *   if (success) {
 *     // Additional logic after successful order
 *   }
 * };
 * ```
 */
export function useOrder(): UseOrderResult {
  // Order UseCases from DI container
  const placeOrderUseCase = useContainer(c => c.placeOrderUseCase);
  const placeCloseMarketOrderUseCase = useContainer(c => c.placeCloseMarketOrderUseCase);
  const placeCloseLimitOrderUseCase = useContainer(c => c.placeCloseLimitOrderUseCase);
  const placeTpSlOrdersUseCase = useContainer(c => c.placeTpSlOrdersUseCase);
  const cancelOrdersUseCase = useContainer(c => c.cancelOrdersUseCase);
  const telemetryService = useContainer(c => c.telemetryService);

  // UI state only
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCanceling, setIsCanceling] = useState(false);
  const [error, setError] = useState<string | undefined>(undefined);

  // ==========================================================================
  // Order Placement Operations
  // ==========================================================================

  /**
   * Place a unified order (Market or Limit with optional TP/SL)
   */
  const placeOrder = useCallback(
    async (params: PlaceOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(undefined);

      // Get current leverage for telemetry
      const marginLeverage = useMarginStore.getState().marginLeverage;
      const leverage = marginLeverage?.leverage ?? 1;

      try {
        const result = await placeOrderUseCase.execute(params);

        if (result.success) {
          // Track successful order placement
          telemetryService.trackEvent('order_placed', {
            market: params.coin,
            side: params.side.toLowerCase() as 'long' | 'short',
            orderType: params.orderType.toLowerCase() as 'market' | 'limit',
            size: parseFloat(params.size),
            leverage,
            price: params.limitPrice ? parseFloat(params.limitPrice) : params.marketPrice,
            reduceOnly: params.reduceOnly ?? false,
            hasTpSl: !!params.tpSl,
          });

          const successMessage = buildPlaceOrderSuccessMessage(params);
          toast.success(successMessage.title, {
            description: successMessage.description,
          });
          return true;
        } else {
          // Track failed order
          telemetryService.trackEvent('order_failed', {
            market: params.coin,
            side: params.side.toLowerCase() as 'long' | 'short',
            orderType: params.orderType.toLowerCase() as 'market' | 'limit',
            reason: result.error,
          });

          setError(result.error);
          toast.error('Order Failed', {
            description: result.error,
          });
          return false;
        }
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [placeOrderUseCase, telemetryService],
  );

  /**
   * Close a position with market order
   */
  const placeCloseMarketOrder = useCallback(
    async (params: CloseMarketOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(undefined);

      try {
        const result = await placeCloseMarketOrderUseCase.execute(params);

        if (result.success) {
          // Track successful close order
          telemetryService.trackEvent('close_order_placed', {
            market: params.coin,
            side: params.side.toLowerCase() as 'long' | 'short',
            closeType: 'market',
            size: parseFloat(params.size),
          });

          toast.success('Market Close Order Placed', {
            description: `Market close for ${params.size} ${params.coin}`,
          });
          return true;
        } else {
          // Track failed order
          telemetryService.trackEvent('order_failed', {
            market: params.coin,
            side: params.side.toLowerCase() as 'long' | 'short',
            orderType: 'market',
            reason: result.error,
          });

          setError(result.error);
          toast.error('Market Close Order Failed', {
            description: result.error,
          });
          return false;
        }
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [placeCloseMarketOrderUseCase, telemetryService],
  );

  /**
   * Close a position with limit order
   */
  const placeCloseLimitOrder = useCallback(
    async (params: CloseLimitOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(undefined);

      try {
        const result = await placeCloseLimitOrderUseCase.execute(params);

        if (result.success) {
          // Track successful close order
          telemetryService.trackEvent('close_order_placed', {
            market: params.coin,
            side: params.side.toLowerCase() as 'long' | 'short',
            closeType: 'limit',
            size: parseFloat(params.size),
            price: parseFloat(params.price),
          });

          toast.success('Limit Close Order Placed', {
            description: `Limit close for ${params.size} ${params.coin} @ ${params.price}`,
          });
          return true;
        } else {
          // Track failed order
          telemetryService.trackEvent('order_failed', {
            market: params.coin,
            side: params.side.toLowerCase() as 'long' | 'short',
            orderType: 'limit',
            reason: result.error,
          });

          setError(result.error);
          toast.error('Limit Close Order Failed', {
            description: result.error,
          });
          return false;
        }
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [placeCloseLimitOrderUseCase, telemetryService],
  );

  /**
   * Place TP/SL orders for a position
   */
  const placeTpSlOrders = useCallback(
    async (params: TpSlOrderParams): Promise<boolean> => {
      setIsPlacingOrder(true);
      setError(undefined);

      try {
        const result = await placeTpSlOrdersUseCase.execute(params);

        if (result.success) {
          // Track successful TP/SL order
          telemetryService.trackEvent('tpsl_order_placed', {
            market: params.coin,
            side: params.isLong ? 'long' : 'short',
            hasTp: !!params.tpTriggerPrice,
            hasSl: !!params.slTriggerPrice,
            tpTriggerPrice: params.tpTriggerPrice ? parseFloat(params.tpTriggerPrice) : undefined,
            slTriggerPrice: params.slTriggerPrice ? parseFloat(params.slTriggerPrice) : undefined,
          });

          const description = buildTpSlSuccessMessage(params);
          toast.success('TP/SL Orders Placed', {
            description,
          });
          return true;
        } else {
          // Track failed order
          telemetryService.trackEvent('order_failed', {
            market: params.coin,
            side: params.isLong ? 'long' : 'short',
            orderType: 'limit',
            reason: result.error,
          });

          setError(result.error);
          toast.error('TP/SL Order Failed', {
            description: result.error,
          });
          return false;
        }
      } finally {
        setIsPlacingOrder(false);
      }
    },
    [placeTpSlOrdersUseCase, telemetryService],
  );

  // ==========================================================================
  // Order Cancellation Operations
  // ==========================================================================

  /**
   * Cancel a single order
   */
  const cancelOrder = useCallback(
    async (params: CancelOrderParams): Promise<boolean> => {
      setIsCanceling(true);
      setError(undefined);

      try {
        // Use batch cancel with single order
        const result = await cancelOrdersUseCase.execute({
          orders: [{ coin: params.coin, orderId: params.orderId }],
        });

        if (result.success) {
          // Track successful cancellation
          telemetryService.trackEvent('order_cancelled', {
            market: params.coin,
            orderId: params.orderId,
            isBatch: false,
          });

          toast.success('Order Cancelled', {
            description: `Successfully cancelled order for ${params.coin}`,
          });
          return true;
        } else {
          setError(result.error);
          toast.error('Cancellation Failed', {
            description: result.error,
          });
          return false;
        }
      } finally {
        setIsCanceling(false);
      }
    },
    [cancelOrdersUseCase, telemetryService],
  );

  /**
   * Cancel multiple orders in batch
   */
  const cancelOrders = useCallback(
    async (params: CancelOrdersParams): Promise<boolean> => {
      setIsCanceling(true);
      setError(undefined);

      try {
        const result = await cancelOrdersUseCase.execute(params);

        if (result.success) {
          // Track successful batch cancellation (track first order as representative)
          if (params.orders.length > 0) {
            const firstOrder = params.orders[0];
            telemetryService.trackEvent('order_cancelled', {
              market: firstOrder.coin,
              orderId: firstOrder.orderId,
              isBatch: params.orders.length > 1,
            });
          }

          toast.success('Orders Cancelled', {
            description: `Successfully cancelled ${params.orders.length} order${params.orders.length > 1 ? 's' : ''}`,
          });
          return true;
        } else {
          setError(result.error);
          toast.error('Cancellation Failed', {
            description: result.error,
          });
          return false;
        }
      } finally {
        setIsCanceling(false);
      }
    },
    [cancelOrdersUseCase, telemetryService],
  );

  // ==========================================================================
  // Return Hook Result
  // ==========================================================================

  return {
    // Operations
    placeOrder,
    placeCloseMarketOrder,
    placeCloseLimitOrder,
    placeTpSlOrders,
    cancelOrder,
    cancelOrders,

    // UI state
    isPlacingOrder,
    isCanceling,
    error,
  };
}
