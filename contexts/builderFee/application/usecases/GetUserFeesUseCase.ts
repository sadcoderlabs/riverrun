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

import type { MarketFeeParams, UserFeeRates } from '../../ports/types';
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

  /**
   * Optional market parameters for HIP-3 fee calculation
   * When provided, fees will be calculated with HIP-3 specific multipliers
   */
  marketParams?: MarketFeeParams;
}

export class GetUserFeesUseCase {
  constructor(private readonly exchange: BuilderFeeExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing the wallet address and optional market params
   * @returns User's effective fee rates
   */
  async execute(command: GetUserFeesCommand): Promise<UserFeeRates> {
    const { walletAddress, marketParams } = command;

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

    // Calculate HIP-3 fee multipliers if applicable
    // Formula from Hyperliquid docs:
    // - scaleIfHip3: deployerFeeScale < 1 ? deployerFeeScale + 1 : deployerFeeScale * 2
    // - growthModeScale: 0.1 when growth mode enabled, 1 otherwise
    let scaleIfHip3 = 1;
    let growthModeScale = 1;

    if (marketParams?.isHip3 && marketParams.deployerFeeScale !== undefined) {
      scaleIfHip3 =
        marketParams.deployerFeeScale < 1
          ? marketParams.deployerFeeScale + 1
          : marketParams.deployerFeeScale * 2;
      growthModeScale = marketParams.growthMode === 'enabled' ? 0.1 : 1;
    }

    // Calculate effective rates
    // For HIP-3: baseRate × scaleIfHip3 × growthModeScale × (1 - referralDiscount) × (1 - stakingDiscount) + builderFee
    // For validator perps: baseRate × (1 - referralDiscount) × (1 - stakingDiscount) + builderFee
    const effectiveTakerRate =
      baseTakerRate *
        scaleIfHip3 *
        growthModeScale *
        (1 - referralDiscount) *
        (1 - stakingDiscount) +
      builderFeeRate;
    const effectiveMakerRate =
      baseMakerRate *
        scaleIfHip3 *
        growthModeScale *
        (1 - referralDiscount) *
        (1 - stakingDiscount) +
      builderFeeRate;

    // Base rates include HIP-3 scaling but not discounts (for comparison display)
    const baseTakerWithScale = baseTakerRate * scaleIfHip3 * growthModeScale + builderFeeRate;
    const baseMakerWithScale = baseMakerRate * scaleIfHip3 * growthModeScale + builderFeeRate;

    // Convert to percentage for display (multiply by 100)
    return {
      takerFeePercent: effectiveTakerRate * 100,
      makerFeePercent: effectiveMakerRate * 100,
      baseTakerPercent: baseTakerWithScale * 100,
      baseMakerPercent: baseMakerWithScale * 100,
      hasReferralDiscount: referralDiscount > 0,
      hasStakingDiscount: stakingDiscount > 0,
    };
  }
}
