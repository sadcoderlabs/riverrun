/**
 * BridgePort - Port interface for Bridge business logic
 *
 * This defines the contract for the Bridge service which manages
 * cross-chain USDC bridging between Arbitrum L2 and Hyperliquid L1.
 *
 * Design principles:
 * - Port pattern: Defines interface without implementation details
 * - Coordination Service: User-driven operations (not autonomous)
 * - Explicit balance refresh: Balances are fetched on-demand
 */

import type { DepositResult, WithdrawalResult } from './types';

/**
 * BridgePort interface
 *
 * Manages cross-chain bridging operations:
 * - Deposit: Transfer USDC from Arbitrum to Hyperliquid via bridge contract
 * - Withdraw: Transfer USDC from Hyperliquid to Arbitrum address
 * - Balance queries: Fetch current balances on both chains
 */
export interface BridgePort {
  /**
   * Get USDC balance on Arbitrum
   *
   * Queries the Arbitrum USDC ERC20 contract for the user's balance.
   *
   * @returns USDC balance as formatted string (e.g., "10.5") or undefined if unavailable
   */
  getArbitrumBalance(): Promise<string | undefined>;

  /**
   * Get withdrawable USDC balance on Hyperliquid
   *
   * Queries Hyperliquid's clearinghouse state for available withdrawal amount.
   * This represents USDC not locked in positions or pending orders.
   *
   * @returns Withdrawable balance as string (e.g., "10.5") or undefined if unavailable
   */
  getWithdrawableBalance(): Promise<string | undefined>;

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   *
   * Transfers USDC from user's Arbitrum wallet to the Hyperliquid bridge contract.
   * Handles different wallet types (Privy embedded vs external wallets).
   * Automatically switches to Arbitrum network if needed.
   *
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Deposit result with transaction hash and amount
   * @throws Error if wallet not connected, insufficient balance, or transaction fails
   */
  deposit(amount: string): Promise<DepositResult>;

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   *
   * Initiates a withdrawal using Hyperliquid's withdraw3 API.
   * A $1 USDC fee is deducted from the amount.
   * Funds typically arrive in 3-4 minutes.
   *
   * @param destinationAddress - Arbitrum address to receive USDC (must start with 0x)
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Withdrawal result with success flag and amount
   * @throws Error if wallet not connected, amount too low, or withdrawal fails
   */
  withdraw(destinationAddress: string, amount: string): Promise<WithdrawalResult>;

  /**
   * Refresh balances on both chains
   *
   * Fetches current Arbitrum USDC balance and Hyperliquid withdrawable balance.
   * Updates the bridgeStore with the new values.
   *
   * @returns Promise that resolves when both balances are refreshed
   */
  refreshBalances(): Promise<void>;
}
