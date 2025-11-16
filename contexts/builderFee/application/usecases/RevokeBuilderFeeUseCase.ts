/**
 * RevokeBuilderFeeUseCase
 *
 * Revokes builder fee approval by setting the maximum fee to 0%.
 *
 * Responsibilities:
 * - Execute revocation transaction on-chain (set max fee to 0%)
 * - Return execution result
 *
 * Non-responsibilities:
 * - State management (UI layer responsibility)
 * - Status verification (caller can query if needed)
 *
 * Primarily used for development/testing purposes.
 * After revocation, users will need to approve again for trading.
 */

import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { WalletPort } from '../../../wallet/ports/walletPort';
import { BUILDER_CONFIG } from '../../config';

export class RevokeBuilderFeeUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
  ) {}

  /**
   * Execute the use case
   *
   * @returns Promise<void> - Throws error if revocation fails
   */
  async execute(): Promise<void> {
    const wallet = await this.wallet.active();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    const provider = await wallet.getProvider();
    const signer = await provider.getSigner();

    // Execute revocation (set max fee to 0%)
    await this.exchange.approveBuilderFee(signer, '0%', BUILDER_CONFIG.address);
  }
}
