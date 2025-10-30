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

export interface DepositToken {
  symbol: string;
  fullName: string;
  icon: string; // Icon component name or emoji
  defaultChain: string;
  estimatedTime: string;
  isRecommended?: boolean;
  chainType: UnitChainType; // For Unit Protocol API mapping
  depositMethod: DepositMethod; // Determines which deposit flow to use
  minDepositAmount?: number; // Minimum deposit amount
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
    defaultChain: 'arbitrum',
    estimatedTime: '1 minute',
    isRecommended: true,
    chainType: 'plasma',
    depositMethod: 'hyperliquid-bridge',
    minDepositAmount: 5,
  },
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    defaultChain: 'bitcoin',
    estimatedTime: '20 minutes',
    chainType: 'bitcoin',
    depositMethod: 'unit-protocol',
    minDepositAmount: 0.001,
  },
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    defaultChain: 'ethereum',
    estimatedTime: '3 minutes',
    chainType: 'ethereum',
    depositMethod: 'unit-protocol',
    minDepositAmount: 0.05,
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    defaultChain: 'solana',
    estimatedTime: '13 seconds',
    chainType: 'solana',
    depositMethod: 'unit-protocol',
    minDepositAmount: 0.1,
  },
];
