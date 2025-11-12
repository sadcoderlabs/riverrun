/**
 * Order Command Port - Business interface for order write operations
 *
 * This Port defines all command operations (state-changing operations) for orders:
 * - Order placement (Market, Limit, TP/SL)
 * - Order cancellation
 *
 * Design: Command Service Pattern (CQRS)
 * - Stateless operations
 * - Returns Result objects instead of throwing
 * - Coordinates with other services for dependencies
 */

import type {
  CancelOrderParams,
  CancelOrdersParams,
  CloseLimitOrderParams,
  CloseMarketOrderParams,
  OrderResult,
  PlaceOrderParams,
  TpSlOrderParams,
} from './types';

/**
 * Order Command Port - Interface for order write operations
 */
export interface OrderCommandPort {
  // ============================================================================
  // Order Placement Operations
  // ============================================================================

  /**
   * Place a unified order (Market or Limit with optional TP/SL)
   *
   * Features:
   * - Supports Market and Limit orders
   * - Optional TP/SL attached to the order
   * - Builder fee approval handled internally
   * - No margin validation (UI layer responsibility)
   *
   * @param params - Order parameters
   * @returns Result with success status and optional error message
   */
  placeOrder(params: PlaceOrderParams): Promise<OrderResult>;

  /**
   * Close a position with a market order
   *
   * @param params - Close order parameters
   * @returns Result with success status and optional error message
   */
  placeCloseMarketOrder(params: CloseMarketOrderParams): Promise<OrderResult>;

  /**
   * Close a position with a limit order
   *
   * @param params - Close order parameters
   * @returns Result with success status and optional error message
   */
  placeCloseLimitOrder(params: CloseLimitOrderParams): Promise<OrderResult>;

  /**
   * Place TP/SL orders on an existing position
   *
   * @param params - TP/SL parameters
   * @returns Result with success status and optional error message
   */
  placeTpSlOrders(params: TpSlOrderParams): Promise<OrderResult>;

  // ============================================================================
  // Order Cancellation Operations
  // ============================================================================

  /**
   * Cancel a single order
   *
   * @param params - Order identification
   * @returns Result with success status and optional error message
   */
  cancelOrder(params: CancelOrderParams): Promise<OrderResult>;

  /**
   * Cancel multiple orders in batch
   *
   * @param params - Orders to cancel
   * @returns Result with success status and optional error message
   */
  cancelOrders(params: CancelOrdersParams): Promise<OrderResult>;
}
