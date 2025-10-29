export interface DepositToken {
  symbol: string;
  fullName: string;
  icon: string; // Icon component name or emoji
  defaultChain: string;
  estimatedTime: string;
  isRecommended?: boolean;
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
  },
  {
    symbol: 'BTC',
    fullName: 'Bitcoin',
    icon: '₿',
    defaultChain: 'bitcoin',
    estimatedTime: '20 minutes',
  },
  {
    symbol: 'ETH',
    fullName: 'Ethereum',
    icon: 'Ξ',
    defaultChain: 'ethereum',
    estimatedTime: '3 minutes',
  },
  {
    symbol: 'SOL',
    fullName: 'Solana',
    icon: '◎',
    defaultChain: 'solana',
    estimatedTime: '13 seconds',
  },
  {
    symbol: 'FART',
    fullName: 'Fartcoin',
    icon: '💨',
    defaultChain: 'solana',
    estimatedTime: '13 seconds',
  },
];
