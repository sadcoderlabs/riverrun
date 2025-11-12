/**
 * Hyperliquid Bridge Adapter - Infrastructure adapter for Hyperliquid withdrawal operations
 *
 * This adapter handles all Hyperliquid L1 bridge interactions:
 * - Query withdrawable USDC balance from clearinghouse state
 * - Execute USDC withdrawal to Arbitrum
 *
 * Design principles:
 * - Pure infrastructure logic (no business rules)
 * - Delegates to HyperliquidGateway for API calls
 * - Throws errors for upper layers to handle
 */

import type { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import type { Signer } from 'ethers';

/**
 * Get withdrawable USDC balance from Hyperliquid
 *
 * @param gateway - HyperliquidGateway instance
 * @param userAddress - User's address
 * @returns Withdrawable balance as string (e.g., "10.5") or undefined if unavailable
 */
export async function getWithdrawableBalance(
  gateway: HyperliquidGateway,
  userAddress: string,
): Promise<string | undefined> {
  try {
    const state = await gateway.getClearinghouseState(userAddress);
    return state.withdrawable;
  } catch (err) {
    console.error('[HyperliquidBridgeAdapter] Failed to fetch withdrawable balance:', err);
    return undefined;
  }
}

/**
 * Execute USDC withdrawal to Arbitrum
 *
 * Uses Hyperliquid's withdraw3 API to transfer USDC to an Arbitrum address.
 * A $1 USDC fee is automatically deducted from the amount.
 *
 * @param gateway - HyperliquidGateway instance
 * @param signer - User's signer for signing withdrawal request
 * @param destinationAddress - Arbitrum address to receive USDC
 * @param amount - Amount to withdraw (human-readable, e.g., "10.5")
 * @returns True if withdrawal succeeded, false otherwise
 * @throws Error if withdrawal fails
 */
export async function executeWithdrawal(
  gateway: HyperliquidGateway,
  signer: Signer,
  destinationAddress: string,
  amount: string,
): Promise<boolean> {
  try {
    const response = await gateway.withdraw(signer, destinationAddress, amount);
    return response.status === 'ok';
  } catch (err) {
    console.error('[HyperliquidBridgeAdapter] Withdrawal failed:', err);
    throw err;
  }
}
