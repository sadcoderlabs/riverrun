/**
 * Set Margin Leverage UseCase
 *
 * Business logic for updating margin mode and leverage for a trading position.
 *
 * Responsibilities:
 * - Execute the leverage update via exchange API
 * - Convert margin mode to exchange format
 *
 * NOT responsible for:
 * - Leverage range validation (handled by Hook/UI layer)
 * - Getting agent wallet (passed via command)
 * - Getting market data (passed via command)
 */

import type { MarginExchangePort } from '../ports/MarginExchangePort';
import type { SetMarginLeverageCommand } from '../../ports/types';

/**
 * UseCase for setting margin leverage
 */
export class SetMarginLeverageUseCase {
  constructor(private readonly exchange: MarginExchangePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command containing all necessary parameters
   */
  async execute(command: SetMarginLeverageCommand): Promise<void> {
    const { agentWallet, assetId, leverage, marginMode } = command;

    // Create agent exchange client
    const exchangeClient = this.exchange.getAgentExchangeClient(agentWallet.signer);

    // Convert marginMode to isCross for API
    const isCross = marginMode === 'cross';

    // Call exchange API to update leverage
    await this.exchange.updateLeverage({
      client: exchangeClient,
      asset: assetId,
      isCross,
      leverage,
    });

    // Note: WebSocket will automatically update marginStore with new values
    // No need to manually update the store
  }
}
