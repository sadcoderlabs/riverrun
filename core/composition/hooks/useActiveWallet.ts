import { useState, useEffect } from 'react';
import { useWalletComposition } from '../walletComposition';
import type { ActiveWallet, WalletSource } from '../../contexts/wallet/ports/types';

export interface UseActiveWalletResult {
  /**
   * Active wallet information and operations.
   * undefined when no wallet is connected.
   */
  wallet: ActiveWallet | undefined;

  /**
   * The currently selected wallet source.
   * This is useful for UI to highlight the active wallet selection.
   * undefined means no explicit selection (using default priority).
   */
  selectedSource: WalletSource | undefined;
}

/**
 * useActiveWallet - Reactive access to the currently active wallet
 *
 * This hook provides convenient reactive access to the active wallet by
 * wrapping WalletService.active() and automatically subscribing to state
 * changes that affect the active wallet.
 *
 * The hook computes the active wallet on-demand (no caching in Zustand)
 * but provides React-level reactivity through WalletService changes.
 *
 * Note: WalletService is recreated whenever any relevant state changes
 * (wallet addresses, connection states, selected source), so we only need
 * to depend on walletService itself - no need to subscribe to individual
 * state changes.
 *
 * The wallet system initialization is handled by WalletCompositionProvider,
 * which only renders children when ready. Therefore, this hook can safely
 * assume walletService is always available.
 *
 * @returns {UseActiveWalletResult}
 * - `wallet`: Active wallet information and operations, or undefined if not connected
 *
 * @example
 * ```tsx
 * const { wallet } = useActiveWallet();
 *
 * if (!wallet) {
 *   return <Text>Not connected</Text>;
 * }
 *
 * return <Text>Connected: {wallet.address}</Text>;
 * ```
 */
export function useActiveWallet(): UseActiveWalletResult {
  const { walletService } = useWalletComposition();
  const [wallet, setWallet] = useState<ActiveWallet | undefined>(undefined);
  const [selectedSource, setSelectedSource] = useState<WalletSource | undefined>(undefined);

  // Fetch active wallet whenever walletService changes
  // (walletService is recreated when any relevant state changes)
  useEffect(() => {
    let mounted = true;

    walletService
      .active()
      .then(activeWallet => {
        if (mounted) {
          setWallet(activeWallet);
          setSelectedSource(activeWallet?.source);
        }
      })
      .catch(error => {
        console.error('Failed to get active wallet:', error);
        if (mounted) {
          setWallet(undefined);
          setSelectedSource(undefined);
        }
      });

    return () => {
      mounted = false;
    };
  }, [walletService]);

  return {
    wallet,
    selectedSource,
  };
}
