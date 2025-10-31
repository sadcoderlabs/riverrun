import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useAccount, useWalletInfo, useProvider } from '@reown/appkit-react-native';
import { BrowserProvider, Signer } from 'ethers';
import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useWalletStore, type WalletSource } from '@/lib/riverrun/store/wallet.store';

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
  switchChain: (chainId: number) => Promise<void>;
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

  // Store latest wallet state in refs to allow stable function references
  // This ensures getProvider/getSigner/switchChain don't change on every render
  const activeSourceRef = useRef(activeSource);
  const embeddedWalletRef = useRef(embeddedWallet);
  const reownProviderRef = useRef(reownProvider);

  useEffect(() => {
    activeSourceRef.current = activeSource;
    embeddedWalletRef.current = embeddedWallet;
    reownProviderRef.current = reownProvider;
  }, [activeSource, embeddedWallet, reownProvider]);

  /**
   * Get the ethers.js BrowserProvider for the currently selected wallet.
   *
   * @returns BrowserProvider instance or undefined if no wallet is connected
   */
  const getProvider = useCallback(async (): Promise<BrowserProvider | undefined> => {
    try {
      if (activeSourceRef.current === 'privy' && embeddedWalletRef.current) {
        // Privy embedded wallet - use getProvider() for React Native
        const eip1193Provider = await embeddedWalletRef.current.getProvider();
        return new BrowserProvider(eip1193Provider);
      } else if (activeSourceRef.current === 'reown' && reownProviderRef.current) {
        // Reown external wallet
        return new BrowserProvider(reownProviderRef.current as any);
      }
      return undefined;
    } catch (error) {
      console.error('Failed to get provider:', error);
      return undefined;
    }
  }, []); // Empty deps - stable reference, always reads latest state from refs

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
  }, [getProvider]); // getProvider is now stable, so this is also stable

  /**
   * Switch to a different blockchain network
   *
   * @param chainId - The chain ID to switch to (e.g., 42161 for Arbitrum)
   * @throws Error if switching fails or wallet doesn't support it
   */
  const switchChain = useCallback(async (chainId: number): Promise<void> => {
    try {
      const chainIdHex = `0x${chainId.toString(16)}`; // Convert to hex

      if (activeSourceRef.current === 'privy' && embeddedWalletRef.current) {
        // Privy: Use provider.request with wallet_switchEthereumChain
        const provider = await embeddedWalletRef.current.getProvider();
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        console.log(`Switched to chain ${chainId} (${chainIdHex}) via Privy`);
      } else if (activeSourceRef.current === 'reown' && reownProviderRef.current) {
        // Reown: Use provider.request with wallet_switchEthereumChain
        // The provider should support EIP-1193 standard methods
        if (!(reownProviderRef.current as any).request) {
          throw new Error('Provider does not support network switching');
        }

        await (reownProviderRef.current as any).request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
        console.log(`Switched to chain ${chainId} (${chainIdHex}) via Reown`);
      } else {
        throw new Error('No active wallet to switch chain');
      }
    } catch (error) {
      console.error('Failed to switch chain:', error);
      throw error;
    }
  }, []); // Empty deps - stable reference, always reads latest state from refs

  return useMemo(
    () => ({
      isAuthenticated,
      isReady,
      address,
      walletName,
      walletType,
      getProvider, // Stable reference (empty deps)
      getSigner, // Stable reference (depends only on stable getProvider)
      switchChain, // Stable reference (empty deps)
    }),
    [
      isAuthenticated,
      isReady,
      address,
      walletName,
      walletType,
      getProvider, // Stable, won't trigger re-memoization
      getSigner, // Stable, won't trigger re-memoization
      switchChain, // Stable, won't trigger re-memoization
    ],
  );
}
