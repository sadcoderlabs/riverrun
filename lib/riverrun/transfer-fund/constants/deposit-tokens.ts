/**
 * Chain type mapping for Unit Protocol API
 * Maps to the keys in /v2/estimate-fees response
 */
export type UnitChainType = 'bitcoin' | 'ethereum' | 'plasma' | 'solana' | 'spl';

/**
 * Deposit method type
 * - hyperliquid-bridge: Direct bridge from Arbitrum (USDC only)
 * - unit-protocol: Deposit via Unit Protocol address (BTC, ETH, SOL)
 */
export type DepositMethod = 'hyperliquid-bridge' | 'unit-protocol';

/**
 * Supported chains configuration
 */
export const CHAINS = {
  arbitrum: {
    name: 'arbitrum',
    displayName: 'Arbitrum',
    icon: '🔷',
    unitChainType: 'plasma' as UnitChainType,
  },
  bitcoin: {
    name: 'bitcoin',
    displayName: 'Bitcoin',
    icon: '₿',
    unitChainType: 'bitcoin' as UnitChainType,
  },
  ethereum: {
    name: 'ethereum',
    displayName: 'Ethereum',
    icon: 'Ξ',
    unitChainType: 'ethereum' as UnitChainType,
  },
  solana: {
    name: 'solana',
    displayName: 'Solana',
    icon: '◎',
    unitChainType: 'solana' as UnitChainType,
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
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    supportChains: [
      {
        chain: 'bitcoin',
        depositMethod: 'unit-protocol',
      },
    ],
  },
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    supportChains: [
      {
        chain: 'ethereum',
        depositMethod: 'unit-protocol',
      },
    ],
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    supportChains: [
      {
        chain: 'solana',
        depositMethod: 'unit-protocol',
      },
    ],
  },
];
