/**
 * GetWithdrawableBalanceUseCase - Query withdrawable USDC on Hyperliquid
 *
 * Single Responsibility:
 * - Query user's withdrawable USDC balance on Hyperliquid L1
 * - No state management (handled by UI layer)
 * - No wallet selection (provided via command)
 *
 * Design principles:
 * - Query UseCase: read-only operation
 * - Command Pattern: all params via Command type
 * - Pure business logic (no UI, no state updates)
 */

import type { HyperliquidBridgePort } from '../ports/HyperliquidBridgePort';

/**
 * Command for getting withdrawable balance
 */
export type GetWithdrawableBalanceCommand = {
  walletAddress: string;
};

/**
 * GetWithdrawableBalanceUseCase
 *
 * Queries the user's withdrawable USDC balance on Hyperliquid L1.
 */
export class GetWithdrawableBalanceUseCase {
  constructor(private readonly hyperliquidBridge: HyperliquidBridgePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command with wallet address
   * @returns Withdrawable USDC balance (e.g., "10.5") or undefined if unavailable
   */
  async execute(command: GetWithdrawableBalanceCommand): Promise<string | undefined> {
    const { walletAddress } = command;

    const balance = await this.hyperliquidBridge.getWithdrawableBalance(walletAddress);

    return balance;
  }
}
