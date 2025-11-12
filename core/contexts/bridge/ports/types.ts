/**
 * Bridge Domain Types
 *
 * Types for the bridge bounded context, handling cross-chain USDC bridging
 * between Arbitrum L2 and Hyperliquid L1.
 */

/**
 * Bridge balances on both chains
 */
export interface BridgeBalances {
  /** USDC balance on Arbitrum (source for deposits) */
  arbitrumUsdc: string | undefined;
  /** Withdrawable USDC on Hyperliquid (available for withdrawal) */
  hyperliquidWithdrawable: string | undefined;
}

/**
 * Result of a deposit operation
 */
export interface DepositResult {
  /** Transaction hash on Arbitrum */
  txHash: string;
  /** Amount deposited (as string, e.g., "10.5") */
  amount: string;
}

/**
 * Result of a withdrawal operation
 */
export interface WithdrawalResult {
  /** Whether the withdrawal was successful */
  success: boolean;
  /** Amount withdrawn (as string, e.g., "10.5") */
  amount: string;
}
