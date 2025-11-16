/**
 * BuilderFeeExchangePort
 *
 * Out port for builder fee operations on the exchange.
 * This port abstracts the interaction with the Hyperliquid exchange
 * for builder fee approval operations.
 *
 * Implementations should handle:
 * - Querying current max builder fee approval
 * - Executing builder fee approval transactions
 */

import type { Signer } from 'ethers';

export interface BuilderFeeExchangePort {
  /**
   * Get the maximum builder fee approved for a wallet and builder address
   *
   * @param walletAddress - The wallet address to check
   * @param builderAddress - The builder address
   * @returns Maximum approved fee in 0.1bps units (e.g., 25 = 0.025%)
   */
  getMaxBuilderFee(walletAddress: string, builderAddress: string): Promise<number>;

  /**
   * Approve builder fee for a specific builder address
   *
   * This executes a transaction to approve a maximum builder fee.
   * The actual fee charged will be lower than the approved maximum.
   *
   * @param signer - The ethers Signer to sign the transaction
   * @param maxFeeRate - Maximum fee rate as percentage string (e.g., '0.1%')
   * @param builderAddress - The builder address to approve for
   */
  approveBuilderFee(signer: Signer, maxFeeRate: string, builderAddress: string): Promise<void>;
}
