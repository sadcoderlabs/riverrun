/**
 * HyperliquidBridgePort - Out Port for Hyperliquid L1 operations
 *
 * This port defines the interface for Hyperliquid-related bridge operations:
 * - Query withdrawable USDC balance on Hyperliquid
 * - Withdraw USDC from Hyperliquid to Arbitrum
 *
 * Implementation responsibility:
 * - Query clearinghouse state from Hyperliquid API
 * - Execute withdrawal request via Hyperliquid API
 * - Sign withdrawal with user's signer
 *
 * Design principles:
 * - Out Port: defined in application layer, implemented in infrastructure layer
 * - Abstracts away API details (HTTP, signing, encoding)
 * - Throws errors for business layer to handle
 */

import type { Signer } from 'ethers';

/**
 * HyperliquidBridgePort interface
 */
export interface HyperliquidBridgePort {
  /**
   * Get withdrawable USDC balance on Hyperliquid
   *
   * @param walletAddress - User's wallet address
   * @returns Formatted withdrawable balance (e.g., "10.5") or undefined if unavailable
   */
  getWithdrawableBalance(walletAddress: string): Promise<string | undefined>;

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   *
   * Implementation should:
   * - Sign withdrawal request with provided signer
   * - Send withdrawal request to Hyperliquid API
   * - Return status of the withdrawal request
   *
   * @param signer - Ethers.js signer for signing the withdrawal request
   * @param destinationAddress - Arbitrum address to receive USDC
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Withdrawal status (e.g., "ok" or error status)
   * @throws Error if withdrawal fails or API returns error
   */
  withdrawUsdc(signer: Signer, destinationAddress: string, amount: string): Promise<string>;
}
