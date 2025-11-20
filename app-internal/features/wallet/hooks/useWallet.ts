import { useCallback } from 'react';
import { useWalletComposition } from '../components/walletComposition';
import type {
  ActiveWallet,
  WalletSource,
  WalletInfo,
} from '../../../../contexts/wallet/ports/types';
import type { Signer } from 'ethers';

export interface UseWalletResult {
  /**
   * Active wallet information.
   * undefined when no wallet is connected.
   */
  wallet: ActiveWallet | undefined;

  /**
   * Wallet address (convenience accessor).
   * undefined when no wallet is connected.
   */
  address: string | undefined;

  /**
   * Whether a wallet is currently connected.
   */
  isConnected: boolean;

  /**
   * Whether Privy is ready to be used.
   */
  isPrivyReady: boolean;

  /**
   * Connect to a wallet (Privy or Reown)
   */
  connect: (source: WalletSource) => Promise<void>;

  /**
   * Disconnect from a wallet
   */
  disconnect: (source: WalletSource) => Promise<void>;

  /**
   * Switch to a different connected wallet
   */
  setActive: (source: WalletSource) => Promise<void>;

  /**
   * List all available (connected) wallets
   */
  listAvailable: () => Promise<WalletInfo[]>;

  /**
   * Get an ethers.js Signer for the active wallet
   */
  getSigner: () => Promise<Signer>;
}

/**
 * useWallet - Comprehensive wallet management hook
 *
 * This is the main hook for all wallet operations. It provides:
 * - Reactive access to the active wallet (via React Context)
 * - Convenience accessors (address, isConnected)
 * - All wallet operations (connect, disconnect, switch, sign, etc.)
 *
 * The active wallet is computed by walletService.active() and updated reactively
 * by WalletCompositionProvider when any relevant state changes.
 *
 * @example
 * ```tsx
 * const { wallet, address, isConnected, connect, disconnect } = useWallet();
 *
 * // Check if connected
 * if (!isConnected) {
 *   return <Button onPress={() => connect('privy')}>Connect</Button>;
 * }
 *
 * // Display wallet info and disconnect button
 * return (
 *   <View>
 *     <Text>Connected: {address}</Text>
 *     <Button onPress={() => disconnect(wallet.source)}>Disconnect</Button>
 *   </View>
 * );
 * ```
 */
export function useWallet(): UseWalletResult {
  const { walletService, activeWallet } = useWalletComposition();

  // Derive convenience values from activeWallet
  const address = activeWallet?.address;
  const isConnected = activeWallet !== undefined;
  const isPrivyReady = walletService.isPrivyReady();

  // Wrap walletService methods with useCallback for stable references
  const connect = useCallback(
    (source: WalletSource) => walletService.connect(source),
    [walletService],
  );

  const disconnect = useCallback(
    (source: WalletSource) => walletService.disconnect(source),
    [walletService],
  );

  const setActive = useCallback(
    (source: WalletSource) => walletService.setActive(source),
    [walletService],
  );

  const listAvailable = useCallback(() => walletService.listAvailable(), [walletService]);

  const getSigner = useCallback(() => walletService.getSigner(), [walletService]);

  return {
    wallet: activeWallet,
    address,
    isConnected,
    isPrivyReady,
    connect,
    disconnect,
    setActive,
    listAvailable,
    getSigner,
  };
}
