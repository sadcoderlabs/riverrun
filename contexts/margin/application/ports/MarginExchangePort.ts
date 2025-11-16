/**
 * Margin Exchange Port - Out Port
 *
 * Defines the interface for exchange operations related to margin/leverage.
 * This port abstracts the Hyperliquid exchange API operations.
 */

import type { Signer } from 'ethers';

/**
 * Port for margin/leverage exchange operations
 */
export interface MarginExchangePort {
  /**
   * Update leverage and margin mode for an asset
   *
   * @param signer - Signer for the agent wallet executing the operation
   * @param params - Update parameters
   * @param params.asset - Asset ID
   * @param params.isCross - True for cross margin, false for isolated
   * @param params.leverage - Leverage value
   */
  updateLeverage(
    signer: Signer,
    params: {
      asset: number;
      isCross: boolean;
      leverage: number;
    },
  ): Promise<void>;
}
