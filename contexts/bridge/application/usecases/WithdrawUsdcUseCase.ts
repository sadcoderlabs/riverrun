/**
 * WithdrawUsdcUseCase - Withdraw USDC from Hyperliquid to Arbitrum
 *
 * Single Responsibility:
 * - Validate withdrawal amount (business rule: minimum 2 USDC)
 * - Validate destination address format
 * - Execute USDC withdrawal via Hyperliquid API
 * - Return withdrawal result
 *
 * Not responsible for:
 * - Signer selection (provided via command)
 * - State management (handled by UI layer)
 * - Balance refresh (handled by UI layer)
 * - User confirmation (handled by UI layer)
 *
 * Design principles:
 * - Command UseCase: modifies state (initiates withdrawal)
 * - Command Pattern: all params via Command type
 * - Pure business logic (no UI, no state updates)
 */

import type { Signer } from 'ethers';
import type { HyperliquidBridgePort } from '../ports/HyperliquidBridgePort';
import { BRIDGE_LIMITS } from '../../config';
import type { WithdrawalResult } from '../../ports/types';

/**
 * Command for withdrawing USDC
 */
export type WithdrawUsdcCommand = {
  /** Ethers.js signer for signing the withdrawal request */
  signer: Signer;
  /** Arbitrum address to receive USDC */
  destinationAddress: string;
  /** Amount in USDC (human-readable, e.g., "10.5") */
  amount: string;
};

/**
 * WithdrawUsdcUseCase
 *
 * Withdraws USDC from Hyperliquid to Arbitrum.
 */
export class WithdrawUsdcUseCase {
  constructor(private readonly hyperliquidBridge: HyperliquidBridgePort) {}

  /**
   * Execute the use case
   *
   * @param command - Command with signer, destination address, and amount
   * @returns Withdrawal result with success status and amount
   * @throws Error if validation fails or withdrawal fails
   */
  async execute(command: WithdrawUsdcCommand): Promise<WithdrawalResult> {
    const { signer, destinationAddress, amount } = command;

    // Business rule: Validate minimum withdrawal amount
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < BRIDGE_LIMITS.minimumWithdrawal) {
      throw new Error(`Minimum withdrawal amount is ${BRIDGE_LIMITS.minimumWithdrawal} USDC`);
    }

    // Business rule: Validate destination address format
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Arbitrum address format');
    }

    // Execute withdrawal via HyperliquidBridgePort
    // Port implementation will:
    // - Sign withdrawal request with provided signer
    // - Send request to Hyperliquid API
    // - Return status
    const status = await this.hyperliquidBridge.withdrawUsdc(signer, destinationAddress, amount);

    // Verify withdrawal was successful
    if (status !== 'ok') {
      throw new Error('Withdrawal request was not successful');
    }

    return {
      success: true,
      amount,
    };
  }
}
