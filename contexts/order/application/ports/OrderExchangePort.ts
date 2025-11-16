/**
 * OrderExchangePort
 *
 * Out port for order-related exchange operations.
 * This port abstracts the blockchain/exchange layer for order management.
 *
 * Design Pattern: Port (Hexagonal Architecture)
 * - Application layer defines the interface
 * - Infrastructure layer provides implementations (HyperliquidGateway)
 * - UseCases depend on this port, not on concrete implementations
 *
 * Responsibilities:
 * - Place orders (market, limit, with TP/SL)
 * - Cancel orders (single or batch)
 *
 * Non-responsibilities:
 * - Business logic validation (UseCase responsibility)
 * - BuilderFee approval (UseCase responsibility)
 * - Agent wallet management (UseCase responsibility)
 */

import type { Signer } from 'ethers';

/**
 * Order request parameters for the exchange
 * Maps to Hyperliquid SDK's order request format
 */
export interface OrderRequest {
  /**
   * Array of order specifications
   * Can include parent orders and TP/SL child orders
   */
  orders: any[]; // Using 'any' to match Hyperliquid SDK types

  /**
   * Order grouping strategy
   * - 'na': No grouping (single order)
   * - 'normalTpsl': Parent order with TP/SL children
   * - 'positionTpsl': TP/SL for existing position
   */
  grouping: 'na' | 'normalTpsl' | 'positionTpsl';

  /**
   * Builder fee parameters
   * Required for collecting fees on trades
   */
  builder: {
    b: string; // Builder address
    f: number; // Fee rate in tenths of basis point
  };
}

/**
 * Cancel request parameters for the exchange
 */
export interface CancelRequest {
  /**
   * Array of orders to cancel
   */
  cancels: Array<{
    a: number; // Asset ID
    o: number; // Order ID
  }>;
}

/**
 * Order exchange response
 */
export interface OrderResponse {
  /**
   * Response status and data from exchange
   */
  response: {
    data: {
      statuses?: Array<any>;
    };
  };
}

/**
 * OrderExchangePort interface
 *
 * All methods follow the pattern:
 * - First parameter: Signer (for creating exchange client)
 * - Second parameter: Request parameters (structured object)
 * - Return: Response from exchange
 */
export interface OrderExchangePort {
  /**
   * Place an order on the exchange
   *
   * @param signer - Signer to sign the order transaction
   * @param request - Order request parameters
   * @returns Order response from exchange
   */
  placeOrder(signer: Signer, request: OrderRequest): Promise<OrderResponse>;

  /**
   * Cancel orders on the exchange
   *
   * @param signer - Signer to sign the cancel transaction
   * @param request - Cancel request parameters
   * @returns Promise that resolves when cancellation is complete
   */
  cancelOrders(signer: Signer, request: CancelRequest): Promise<void>;
}
