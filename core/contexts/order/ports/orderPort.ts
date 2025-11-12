/**
 * Order Context - Business Interface (In Port)
 *
 * This Port defines the business capabilities provided by the Order context.
 * It combines autonomous service lifecycle (start/stop) with business operations.
 */

// ============================================================================
// Operation Parameters
// ============================================================================

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

// ============================================================================
// Result Types
// ============================================================================

/**
 * Result type for order operations
 * Used instead of throwing exceptions for clearer error handling
 */
export interface OrderResult {
  success: boolean;
  error?: string;
}

// ============================================================================
// Order Port Interface
// ============================================================================

/**
 * Order Port - Business interface for order operations
 *
 * This Port defines the business capabilities of the Order context:
 * - Autonomous lifecycle (start/stop)
 * - Order placement operations (market, limit, TP/SL)
 * - Order cancellation operations
 *
 * Design: Autonomous Service (like Position Context)
 * - Service automatically monitors wallet changes and manages subscriptions
 * - External code only needs to call start() once and operations as needed
 */
export interface OrderPort {
  // ============================================================================
  // Lifecycle Management
  // ============================================================================

  /**
   * Start the Order Service
   * Begins monitoring wallet changes and automatically manages open orders subscription
   */
  start(): void;

  /**
   * Stop the Order Service
   * Stops monitoring and cleans up all subscriptions
   */
  stop(): void;

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
