/**
 * Deposit Tokens Configuration
 *
 * UI configuration for supported deposit tokens and chains.
 * This is presentation-layer configuration, not domain logic.
 */

/**
 * Deposit method type
 * - hyperliquid-bridge: Direct bridge from Arbitrum (USDC only)
 */
export type DepositMethod = 'hyperliquid-bridge';

/**
 * Supported chains configuration
 */
export const CHAINS = {
  arbitrum: {
    name: 'arbitrum',
    displayName: 'Arbitrum',
    icon: '🔷',
  },
} as const;

export type ChainName = keyof typeof CHAINS;

/**
 * Support chain configuration for a token
 */
export interface SupportChain {
  chain: ChainName;
  depositMethod: DepositMethod;
}

/**
 * Deposit token interface
 */
export interface DepositToken {
  symbol: string;
  fullName: string;
  icon: string;
  isRecommended?: boolean;
  supportChains: SupportChain[];
}

/**
 * Curated list of deposit tokens supported by Hyperliquid
 * Displayed in the deposit screen for users to select
 */
export const DEPOSIT_TOKENS: DepositToken[] = [
  {
    symbol: 'USDC',
    fullName: 'USD Coin',
    icon: '💵',
    isRecommended: true,
    supportChains: [
      {
        chain: 'arbitrum',
        depositMethod: 'hyperliquid-bridge',
      },
    ],
  },
];
