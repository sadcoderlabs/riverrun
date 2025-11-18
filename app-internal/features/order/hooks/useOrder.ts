/**
 * useOrder - Business operations hook for orders
 *
 * Provides order placement and cancellation operations with UI integration:
 * - Loading states for UI feedback
 * - Toast notifications for success/failure
 * - Error state management
 *
 * For state access (orders, isLoading), use useOrderStore instead for better performance.
 */

import { useCallback, useState } from 'react';
import { toast } from 'sonner-native';
import { useContainer } from '@/app-internal/di';
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

      try {
        const result = await placeOrderUseCase.execute(params);

        if (result.success) {
          const successMessage = buildPlaceOrderSuccessMessage(params);
          toast.success(successMessage.title, {
            description: successMessage.description,
          });
          return true;
        } else {
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
    [placeOrderUseCase],
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
          toast.success('Market Close Order Placed', {
            description: `Market close for ${params.size} ${params.coin}`,
          });
          return true;
        } else {
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
    [placeCloseMarketOrderUseCase],
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
          toast.success('Limit Close Order Placed', {
            description: `Limit close for ${params.size} ${params.coin} @ ${params.price}`,
          });
          return true;
        } else {
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
    [placeCloseLimitOrderUseCase],
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
          const description = buildTpSlSuccessMessage(params);
          toast.success('TP/SL Orders Placed', {
            description,
          });
          return true;
        } else {
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
    [placeTpSlOrdersUseCase],
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
    [cancelOrdersUseCase],
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
    [cancelOrdersUseCase],
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
