/**
 * GetUserFeesUseCase
 *
 * Queries the user's fee rates from exchange and calculates the effective
 * rates including all discounts and builder fee.
 *
 * Fee calculation:
 * - Base rates come from exchange via BuilderFeeExchangePort
 * - Referral discount and staking discount are applied multiplicatively
 * - Builder fee is added on top of the discounted rate
 *
 * Formula:
 * effectiveRate = baseRate × (1 - referralDiscount) × (1 - stakingDiscount) + builderFee
 *
 * Responsibilities:
 * - Query user fee rates via port
 * - Calculate effective rates with discounts and builder fee
 * - Return rates for UI display
 *
 * Non-responsibilities:
 * - Wallet selection (caller responsibility)
 * - State management (UI layer responsibility)
 * - Direct API calls (delegated to port implementation)
 */

import type { UserFeeRates } from '../../ports/types';
import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import { BUILDER_FEE_RATE } from '../../config';

/**
 * Command for getting user fee rates
 */
export interface GetUserFeesCommand {
  /**
   * Wallet address to get fee rates for
   */
  walletAddress: string;
}

export class GetUserFeesUseCase {
  constructor(private readonly exchange: BuilderFeeExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the wallet address
   * @returns User's effective fee rates
   */
  async execute(command: GetUserFeesCommand): Promise<UserFeeRates> {
    const { walletAddress } = command;

    // Query fee rates from exchange via port
    const response = await this.exchange.getUserFees(walletAddress);

    // Parse rates from API response (stored as strings like "0.00045")
    const baseTakerRate = parseFloat(response.userCrossRate);
    const baseMakerRate = parseFloat(response.userAddRate);
    const referralDiscount = parseFloat(response.activeReferralDiscount);
    const stakingDiscount = parseFloat(response.activeStakingDiscount.discount);

    // Builder fee: 25 units = 0.025% = 0.00025
    // BUILDER_FEE_RATE is in 0.1bps units, so divide by 100000 to get decimal rate
    const builderFeeRate = BUILDER_FEE_RATE / 100000;

    // Calculate effective rates
    // Formula: baseRate × (1 - referralDiscount) × (1 - stakingDiscount) + builderFee
    const effectiveTakerRate =
      baseTakerRate * (1 - referralDiscount) * (1 - stakingDiscount) + builderFeeRate;
    const effectiveMakerRate =
      baseMakerRate * (1 - referralDiscount) * (1 - stakingDiscount) + builderFeeRate;

    // Convert to percentage for display (multiply by 100)
    // Also add builder fee to base rates for comparison display
    return {
      takerFeePercent: effectiveTakerRate * 100,
      makerFeePercent: effectiveMakerRate * 100,
      baseTakerPercent: (baseTakerRate + builderFeeRate) * 100,
      baseMakerPercent: (baseMakerRate + builderFeeRate) * 100,
      hasReferralDiscount: referralDiscount > 0,
      hasStakingDiscount: stakingDiscount > 0,
    };
  }
}
