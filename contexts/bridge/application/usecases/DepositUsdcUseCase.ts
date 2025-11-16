/**
 * DepositUsdcUseCase - Deposit USDC from Arbitrum to Hyperliquid
 *
 * Single Responsibility:
 * - Validate deposit amount (business rule: minimum 5 USDC)
 * - Execute USDC transfer to bridge contract on Arbitrum
 * - Return transaction hash
 *
 * Not responsible for:
 * - Wallet selection (provided via command)
 * - State management (handled by UI layer)
 * - Balance refresh (handled by UI layer)
 * - Network switching (handled by Port implementation)
 *
 * Design principles:
 * - Command UseCase: modifies state (on-chain)
 * - Command Pattern: all params via Command type
 * - Pure business logic (no UI, no state updates)
 */

import type { ArbitrumBridgePort } from '../ports/ArbitrumBridgePort';
import type { ActiveWallet } from '../../../wallet/ports/types';
import { ARBITRUM_CONFIG, BRIDGE_LIMITS } from '../../config';
import type { DepositResult } from '../../ports/types';

/**
 * Command for depositing USDC
 */
export type DepositUsdcCommand = {
  /** User's active wallet (contains type, provider, address) */
  wallet: ActiveWallet;
  /** Amount in USDC (human-readable, e.g., "10.5") */
  amount: string;
};

/**
 * DepositUsdcUseCase
 *
 * Deposits USDC from Arbitrum to Hyperliquid via bridge contract.
 */
export class DepositUsdcUseCase {
  constructor(private readonly arbitrumBridge: ArbitrumBridgePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command with wallet and amount
   * @returns Deposit result with transaction hash and amount
   * @throws Error if validation fails or transaction fails
   */
  async execute(command: DepositUsdcCommand): Promise<DepositResult> {
    const { wallet, amount } = command;

    // Business rule: Validate minimum deposit amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < BRIDGE_LIMITS.minimumDeposit) {
      throw new Error(`Minimum deposit amount is ${BRIDGE_LIMITS.minimumDeposit} USDC`);
    }

    // Execute deposit via ArbitrumBridgePort
    // Port implementation will:
    // - Handle wallet type (Privy vs External)
    // - Switch network if needed
    // - Verify balance
    // - Execute transfer and wait for confirmation
    const txHash = await this.arbitrumBridge.depositUsdc(
      wallet,
      amount,
      ARBITRUM_CONFIG.bridgeAddress,
    );

    return {
      txHash,
      amount,
    };
  }
}
