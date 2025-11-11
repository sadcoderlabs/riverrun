/**
 * Composition Root - Dependency Injection
 *
 * This module provides the composition root for hexagonal architecture,
 * wiring together ports, adapters, and application logic.
 */

export { WalletCompositionProvider, useWalletComposition } from './walletComposition';
export { useActiveWallet } from './hooks/useActiveWallet';
export type { UseActiveWalletResult } from './hooks/useActiveWallet';
