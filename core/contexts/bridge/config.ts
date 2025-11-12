/**
 * Bridge Configuration
 *
 * Constants for cross-chain bridging between Arbitrum L2 and Hyperliquid L1.
 * Contains contract addresses, chain IDs, limits, and fees.
 */

/**
 * Arbitrum network configuration
 */
export const ARBITRUM_CONFIG = {
  /** Chain ID for Arbitrum One */
  chainId: 42161,
  /** Public RPC endpoint for Arbitrum */
  rpcUrl: 'https://arb1.arbitrum.io/rpc',
  /** USDC ERC20 contract address on Arbitrum */
  usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
  /** Hyperliquid bridge contract address on Arbitrum */
  bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7' as const,
} as const;

/**
 * Bridge operation limits
 */
export const BRIDGE_LIMITS = {
  /** Minimum deposit amount in USDC */
  minimumDeposit: 5,
  /** Minimum withdrawal amount in USDC */
  minimumWithdrawal: 2,
} as const;

/**
 * Bridge fees
 */
export const BRIDGE_FEES = {
  /** Withdrawal fee in USDC (deducted from amount) */
  withdrawalFee: 1,
} as const;

/**
 * Gas settings for ERC20 transfers
 */
export const GAS_SETTINGS = {
  /** Fixed gas limit for ERC20 transfers (100,000) */
  erc20TransferGasLimit: 100000n,
} as const;

/**
 * Minimal ERC20 ABI for balance and transfer operations
 */
export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;
