import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useAccount, useWalletInfo, useProvider } from '@reown/appkit-react-native';
import { BrowserProvider, Signer } from 'ethers';
import { useMemo, useCallback } from 'react';
import { useWalletStore, type WalletSource } from '@/store/wallet.store';

export type WalletType = 'privy' | 'external' | undefined;

export interface UseActiveWalletResult {
  // Authentication state
  isAuthenticated: boolean;
  isReady: boolean;

  // Wallet information
  address: string | undefined;
  walletName: string;
  walletType: WalletType;

  // Signing operations
  getProvider: () => Promise<BrowserProvider | undefined>;
  getSigner: () => Promise<Signer | undefined>;
}

/**
 * Active Wallet Hook
 *
 * Provides the state and operations for the currently selected wallet.
 * Automatically reads the user's wallet selection from the wallet store.
 *
 * @example
 * ```tsx
 * const {
 *   isAuthenticated,
 *   address,
 *   walletName,
 *   getProvider,
 *   getSigner,
 * } = useActiveWallet();
 *
 * if (!isAuthenticated) {
 *   return <Text>Not connected</Text>;
 * }
 *
 * return <Text>Connected: {address}</Text>;
 * ```
 */
export function useActiveWallet(): UseActiveWalletResult {
  // Wallet store
  const { selectedWalletSource } = useWalletStore();

  // Privy hooks
  const { isReady: privyReady } = usePrivy();
  const { wallets: embeddedWallets } = useEmbeddedEthereumWallet();

  // Reown hooks
  const { address: reownAddress, isConnected } = useAccount();
  const { walletInfo } = useWalletInfo();
  const { provider: reownProvider } = useProvider();

  // Get wallet information
  const embeddedWallet = embeddedWallets?.[0];
  const embeddedAddress = embeddedWallet?.address;

  // Determine active wallet based on user selection or default priority
  let activeSource: WalletSource | undefined = selectedWalletSource;

  // If no explicit selection, use default priority (Privy > Reown)
  if (!activeSource) {
    if (embeddedAddress) {
      activeSource = 'privy';
    } else if (isConnected) {
      activeSource = 'reown';
    }
  }

  // Ensure the selected wallet is actually connected
  if (activeSource === 'privy' && !embeddedAddress) {
    // Privy wallet is selected but not connected, fallback to Reown if available
    activeSource = isConnected ? 'reown' : undefined;
  }
  if (activeSource === 'reown' && !isConnected) {
    // Reown wallet is selected but not connected, fallback to Privy if available
    activeSource = embeddedAddress ? 'privy' : undefined;
  }

  // Get active wallet information
  const address =
    activeSource === 'privy'
      ? embeddedAddress
      : activeSource === 'reown'
        ? reownAddress
        : undefined;

  const walletType: WalletType =
    activeSource === 'privy' ? 'privy' : activeSource === 'reown' ? 'external' : undefined;

  const walletName =
    activeSource === 'privy'
      ? 'Privy Wallet'
      : activeSource === 'reown'
        ? walletInfo?.name || 'External Wallet'
        : 'Unknown Wallet';

  // Authentication state
  const isAuthenticated = !!activeSource && !!address;
  const isReady = privyReady;

  /**
   * Get the ethers.js BrowserProvider for the currently selected wallet.
   *
   * @returns BrowserProvider instance or undefined if no wallet is connected
   */
  const getProvider = useCallback(async (): Promise<BrowserProvider | undefined> => {
    try {
      if (activeSource === 'privy' && embeddedWallet) {
        // Privy embedded wallet - use getProvider() for React Native
        const eip1193Provider = await embeddedWallet.getProvider();
        return new BrowserProvider(eip1193Provider);
      } else if (activeSource === 'reown' && reownProvider) {
        // Reown external wallet
        return new BrowserProvider(reownProvider as any);
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get provider:', error);
      return undefined;
    }
  }, [activeSource, embeddedWallet, reownProvider]);

  /**
   * Get the ethers.js Signer for the current wallet.
   *
   * @returns Signer instance or undefined if no wallet is connected
   */
  const getSigner = useCallback(async (): Promise<Signer | undefined> => {
    try {
      const provider = await getProvider();
      if (!provider) return undefined;

      const signer = await provider.getSigner();
      return signer;
    } catch (error) {
      console.error('Failed to get signer:', error);
      return undefined;
    }
  }, [getProvider]);

  return useMemo(
    () => ({
      isAuthenticated,
      isReady,
      address,
      walletName,
      walletType,
      getProvider,
      getSigner,
    }),
    [isAuthenticated, isReady, address, walletName, walletType, getProvider, getSigner],
  );
}
