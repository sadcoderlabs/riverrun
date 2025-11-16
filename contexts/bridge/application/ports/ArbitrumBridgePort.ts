/**
 * ArbitrumBridgePort - Out Port for Arbitrum L2 operations
 *
 * This port defines the interface for Arbitrum-related bridge operations:
 * - Query USDC balance on Arbitrum
 * - Deposit USDC from Arbitrum to Hyperliquid
 *
 * Implementation responsibility:
 * - Handle wallet type differences (Privy vs External)
 * - Handle network switching if needed
 * - Execute ERC20 transfer to bridge contract
 *
 * Design principles:
 * - Out Port: defined in application layer, implemented in adapter/infrastructure layer
 * - Abstracts away infrastructure details (RPC, contract interaction)
 * - Throws errors for business layer to handle
 */

import type { ActiveWallet } from '../../../wallet/ports/types';

/**
 * ArbitrumBridgePort interface
 */
export interface ArbitrumBridgePort {
  /**
   * Get USDC balance on Arbitrum
   *
   * @param walletAddress - User's wallet address
   * @returns Formatted USDC balance (e.g., "10.5") or undefined if unavailable
   */
  getArbitrumBalance(walletAddress: string): Promise<string | undefined>;

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   *
   * Implementation should:
   * - Handle wallet type (Privy vs External) internally
   * - Check network and switch if needed
   * - Verify sufficient balance
   * - Execute USDC transfer to bridge contract
   * - Wait for transaction confirmation
   *
   * @param wallet - User's active wallet (contains type, provider, address)
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @param bridgeAddress - Destination bridge contract address
   * @returns Transaction hash
   * @throws Error if transaction fails or validation fails
   */
  depositUsdc(wallet: ActiveWallet, amount: string, bridgeAddress: string): Promise<string>;
}
