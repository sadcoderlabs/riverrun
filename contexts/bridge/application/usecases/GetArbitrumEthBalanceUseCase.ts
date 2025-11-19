/**
 * GetArbitrumEthBalanceUseCase - Query ETH balance on Arbitrum
 *
 * Single Responsibility:
 * - Query user's ETH balance on Arbitrum L2
 * - No state management (handled by UI layer)
 * - No wallet selection (provided via command)
 *
 * Design principles:
 * - Query UseCase: read-only operation
 * - Command Pattern: all params via Command type
 * - Pure business logic (no UI, no state updates)
 */

import type { ArbitrumBridgePort } from '../ports/ArbitrumBridgePort';

/**
 * Command for getting Arbitrum ETH balance
 */
export type GetArbitrumEthBalanceCommand = {
  walletAddress: string;
};

/**
 * GetArbitrumEthBalanceUseCase
 *
 * Queries the user's ETH balance on Arbitrum L2.
 */
export class GetArbitrumEthBalanceUseCase {
  constructor(private readonly arbitrumBridge: ArbitrumBridgePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command with wallet address
   * @returns ETH balance (e.g., "0.5") or undefined if unavailable
   */
  async execute(command: GetArbitrumEthBalanceCommand): Promise<string | undefined> {
    const { walletAddress } = command;

    const balance = await this.arbitrumBridge.getArbitrumEthBalance(walletAddress);

    return balance;
  }
}
