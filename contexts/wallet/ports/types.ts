import type { BrowserProvider } from 'ethers';

/**
 * Wallet source identifier
 */
export type WalletSource = 'privy' | 'reown';

/**
 * Wallet type classification
 */
export type WalletType = 'privy' | 'external';

/**
 * Basic wallet information
 */
export interface WalletInfo {
  source: WalletSource;
  address: string;
  name: string;
  type: WalletType;
  isConnected: boolean;
}

/**
 * Sign message input
 */
export interface SignMessageInput {
  message: string;
  address?: string; // Optional: specify which wallet to use
}

/**
 * Sign transaction input
 */
export interface SignTxInput {
  to: string;
  value?: string;
  data?: string;
  chainId?: number;
  address?: string; // Optional: specify which wallet to use
}

/**
 * Transaction result
 */
export interface TxResult {
  txHash: `0x${string}`;
}

/**
 * Active wallet with operations
 */
export interface ActiveWallet {
  address: string;
  name: string;
  type: WalletType;
  source: WalletSource;

  /**
   * Get ethers.js BrowserProvider for the wallet
   */
  getProvider: () => Promise<BrowserProvider>;

  /**
   * Switch to a different blockchain network
   */
  switchChain: (chainId: number) => Promise<void>;
}
