/**
 * GetArbitrumBalanceUseCase - Query USDC balance on Arbitrum
 *
 * Single Responsibility:
 * - Query user's USDC balance on Arbitrum L2
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
 * Command for getting Arbitrum balance
 */
export type GetArbitrumBalanceCommand = {
  walletAddress: string;
};

/**
 * GetArbitrumBalanceUseCase
 *
 * Queries the user's USDC balance on Arbitrum L2.
 */
export class GetArbitrumBalanceUseCase {
  constructor(private readonly arbitrumBridge: ArbitrumBridgePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command with wallet address
   * @returns USDC balance (e.g., "10.5") or undefined if unavailable
   */
  async execute(command: GetArbitrumBalanceCommand): Promise<string | undefined> {
    const { walletAddress } = command;

    const balance = await this.arbitrumBridge.getArbitrumBalance(walletAddress);

    return balance;
  }
}
