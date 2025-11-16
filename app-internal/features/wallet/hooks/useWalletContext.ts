import { useCallback } from 'react';
import { useWalletComposition } from '../components/walletComposition';
import { useStore } from 'zustand';
import { activeWalletStore } from '../../../../contexts/wallet/adapters/activeWalletStore';
import type {
  ActiveWallet,
  WalletSource,
  WalletInfo,
  SignMessageInput,
  SignTxInput,
  TxResult,
} from '../../../../contexts/wallet/ports/types';
import type { Signer } from 'ethers';

export interface UseWalletContextResult {
  /**
   * Active wallet information and operations.
   * undefined when no wallet is connected.
   */
  wallet: ActiveWallet | undefined;

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
   * Sign a message with the active wallet
   */
  signMessage: (input: SignMessageInput) => Promise<`0x${string}`>;

  /**
   * Sign and send a transaction with the active wallet
   */
  signAndSendTx: (input: SignTxInput) => Promise<TxResult>;

  /**
   * Get an ethers.js Signer for the active wallet
   */
  getSigner: () => Promise<Signer>;
}

/**
 * useWalletContext - Comprehensive wallet management hook
 *
 * This is the main hook for wallet operations. It provides:
 * - Reactive access to the active wallet
 * - All wallet operations (connect, disconnect, switch, sign, etc.)
 *
 * The hook automatically tracks wallet state changes and provides
 * stable callback references for all operations.
 *
 * @example
 * ```tsx
 * const { wallet, connect, disconnect, setActive } = useWalletContext();
 *
 * // Check if connected
 * if (!wallet) {
 *   return <Button onPress={() => connect('privy')}>Connect</Button>;
 * }
 *
 * // Display wallet info and disconnect button
 * return (
 *   <View>
 *     <Text>Connected: {wallet.address}</Text>
 *     <Button onPress={() => disconnect(wallet.source)}>Disconnect</Button>
 *   </View>
 * );
 * ```
 */
export function useWalletContext(): UseWalletContextResult {
  const { walletService } = useWalletComposition();

  // Subscribe to activeWalletStore for reactive updates
  // WalletService automatically updates this store whenever active wallet changes
  const wallet = useStore(activeWalletStore, state => state.wallet);

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

  const signMessage = useCallback(
    (input: SignMessageInput) => walletService.signMessage(input),
    [walletService],
  );

  const signAndSendTx = useCallback(
    (input: SignTxInput) => walletService.signAndSendTx(input),
    [walletService],
  );

  const getSigner = useCallback(() => walletService.getSigner(), [walletService]);

  return {
    wallet,
    connect,
    disconnect,
    setActive,
    listAvailable,
    signMessage,
    signAndSendTx,
    getSigner,
  };
}
