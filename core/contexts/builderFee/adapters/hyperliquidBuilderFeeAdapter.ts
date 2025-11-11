/**
 * Hyperliquid Builder Fee Adapter
 *
 * This adapter encapsulates Hyperliquid SDK calls for builder fee approval operations.
 * It provides a clean interface for the service layer to interact with Hyperliquid.
 *
 * Note: For checking builder fee status, use the rate-limited infoClient wrapper directly
 * in the service layer, as it's already optimized for global usage.
 */

import * as hl from '@nktkas/hyperliquid';

/**
 * Hyperliquid Builder Fee Adapter
 *
 * Handles Hyperliquid SDK interactions for builder fee approval/revocation.
 */
export class HyperliquidBuilderFeeAdapter {
  /**
   * Approve builder fee with a maximum fee rate
   *
   * This method is used for both approval (with maxFeeRate like '0.1%')
   * and revocation (with maxFeeRate '0%').
   *
   * @param params.maxFeeRate - Maximum fee rate as percentage string (e.g., '0.1%')
   * @param params.builder - Builder address
   * @param params.exchangeClient - Hyperliquid ExchangeClient instance
   */
  async approveBuilderFee(params: {
    maxFeeRate: string;
    builder: string;
    exchangeClient: hl.ExchangeClient;
  }): Promise<void> {
    try {
      await params.exchangeClient.approveBuilderFee({
        maxFeeRate: params.maxFeeRate,
        builder: params.builder,
      });
    } catch (error) {
      console.error('[HyperliquidBuilderFeeAdapter] Failed to approve builder fee:', error);
      throw error;
    }
  }
}
