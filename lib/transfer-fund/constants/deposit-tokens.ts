/**
 * Chain type mapping for Unit Protocol API
 * Maps to the keys in /v2/estimate-fees response
 */
export type UnitChainType = 'bitcoin' | 'ethereum' | 'plasma' | 'solana' | 'spl';

export interface DepositToken {
  symbol: string;
  fullName: string;
  icon: string; // Icon component name or emoji
  defaultChain: string;
  estimatedTime: string;
  isRecommended?: boolean;
  chainType: UnitChainType; // For Unit Protocol API mapping
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
    defaultChain: 'hyperliquid,arbitrum',
    estimatedTime: '1 minute',
    isRecommended: true,
    chainType: 'plasma', // Hyperliquid uses Plasma chain
  },
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    defaultChain: 'bitcoin',
    estimatedTime: '20 minutes',
    chainType: 'bitcoin',
  },
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    defaultChain: 'ethereum',
    estimatedTime: '3 minutes',
    chainType: 'ethereum',
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    defaultChain: 'solana',
    estimatedTime: '13 seconds',
    chainType: 'solana', // Native SOL token
  },
  {
    symbol: 'FART',
    fullName: 'Fartcoin',
    icon: '💨',
    defaultChain: 'solana',
    estimatedTime: '13 seconds',
    chainType: 'spl', // SPL token on Solana
  },
];
