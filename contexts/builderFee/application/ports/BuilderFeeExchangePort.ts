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
 * - Querying user fee rates and discounts
 */

import type { Signer } from 'ethers';

/**
 * Raw user fee rates from exchange API
 */
export interface RawUserFees {
  /** Taker rate as decimal string (e.g., "0.00045") */
  userCrossRate: string;
  /** Maker rate as decimal string (e.g., "0.00015") */
  userAddRate: string;
  /** Referral discount as decimal string (e.g., "0.04" = 4%) */
  activeReferralDiscount: string;
  /** Staking discount info */
  activeStakingDiscount: {
    discount: string;
  };
}

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

  /**
   * Get user fee rates and discounts from exchange
   *
   * Returns raw fee data including base rates and active discounts.
   * Business logic for calculating effective rates should be in UseCase layer.
   *
   * @param walletAddress - The wallet address to get fees for
   * @returns Raw user fee rates and discounts
   */
  getUserFees(walletAddress: string): Promise<RawUserFees>;
}
