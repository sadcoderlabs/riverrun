/**
 * Margin Exchange Port - Out Port
 *
 * Defines the interface for exchange operations related to margin/leverage.
 * This port abstracts the Hyperliquid exchange API operations.
 */

import type { ExchangeClient } from '@/infra/hyperliquid/hyperliquidGateway';

/**
 * Port for margin/leverage exchange operations
 */
export interface MarginExchangePort {
  /**
   * Get an agent exchange client for executing margin operations
   *
   * @param signer - Agent wallet signer
   * @returns Exchange client instance
   */
  getAgentExchangeClient(signer: any): ExchangeClient;

  /**
   * Update leverage and margin mode for an asset
   *
   * @param params - Update parameters
   */
  updateLeverage(params: {
    client: ExchangeClient;
    asset: number;
    isCross: boolean;
    leverage: number;
  }): Promise<void>;
}
