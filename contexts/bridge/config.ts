/**
 * Bridge Configuration
 *
 * Constants for cross-chain bridging between Arbitrum L2 and Hyperliquid L1.
 */

export const ARBITRUM_CONFIG = {
  chainId: 42161,
  rpcUrl: process.env.EXPO_PUBLIC_ARBITRUM_RPC_URL || 'https://arb1.arbitrum.io/rpc',
  usdcAddress: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
  bridgeAddress: '0x2Df1c51E09aECF9cacB7bc98cB1742757f163dF7' as const,
} as const;

export const BRIDGE_LIMITS = {
  minimumDeposit: 5,
  minimumWithdrawal: 2,
} as const;

export const BRIDGE_FEES = {
  withdrawalFee: 1,
} as const;

/**
 * Gas settings for Arbitrum transactions
 *
 * Note: Arbitrum gas includes L1 data posting costs, so ERC20 transfers
 * require ~250,000+ gas (vs ~65,000 on Ethereum mainnet).
 * We use eth_estimateGas for accurate limits; these are fallback values.
 */
export const GAS_SETTINGS = {
  /** Fallback gas limit if eth_estimateGas fails */
  erc20TransferGasLimit: 500_000n,
  /** Minimum gas price (0.1 Gwei) */
  minMaxFeePerGas: 100_000_000n,
  /** Minimum priority fee (0.01 Gwei) */
  minMaxPriorityFeePerGas: 10_000_000n,
  /** Safety multiplier for gas price */
  gasPriceMultiplier: 1.5,
} as const;

export const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function transfer(address to, uint256 amount) returns (bool)',
] as const;
