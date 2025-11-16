/**
 * Wallet Context - Hexagonal Architecture
 *
 * Public API for wallet operations in the Riverrun app.
 *
 * Usage: Access the wallet service directly through the composition hook.
 *
 * @example
 * ```tsx
 * import { useWalletComposition } from '@/core/app-internal';
 *
 * function MyComponent() {
 *   const { walletService, isReady } = useWalletComposition();
 *
 *   // Use wallet service directly
 *   const wallet = await walletService.active();
 *   await walletService.connect('privy');
 * }
 * ```
 */

// Types (Public API)
export type {
  WalletSource,
  WalletType,
  WalletInfo,
  ActiveWallet,
  SignMessageInput,
  SignTxInput,
  TxResult,
} from './ports/types';

// Port Interface (for advanced usage and testing)
export type { WalletPort } from './ports/walletPort';
