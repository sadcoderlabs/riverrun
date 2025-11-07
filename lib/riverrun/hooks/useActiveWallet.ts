import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useAccount, useWalletInfo, useProvider } from '@reown/appkit-react-native';
import { BrowserProvider } from 'ethers';
import { useMemo } from 'react';
import { useWalletStore, type WalletSource } from '@/lib/riverrun/store/wallet.store';

export type WalletType = 'privy' | 'external';

export interface ActiveWallet {
  address: string;
  name: string;
  type: WalletType;
  getProvider: () => Promise<BrowserProvider>;
  switchChain: (chainId: number) => Promise<void>;
}

export interface UseActiveWalletResult {
  isReady: boolean;
  wallet: ActiveWallet | undefined;
}

/**
 * Active Wallet Hook
 *
 * Provides unified access to the currently active wallet, abstracting away
 * the differences between Privy embedded wallet and Reown external wallet.
 *
 * @returns {UseActiveWalletResult}
 * - `isReady`: Whether the wallet system is ready (required for Privy)
 * - `wallet`: Active wallet information and operations, or undefined if not connected
 *
 * @example
 * ```tsx
 * const { isReady, wallet } = useActiveWallet();
 *
 * if (!isReady) {
 *   return <Text>Loading...</Text>;
 * }
 *
 * if (!wallet) {
 *   return <Text>Not connected</Text>;
 * }
 *
 * return <Text>Connected: {wallet.address}</Text>;
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

  // Wallet ready state
  const isReady = privyReady;

  // Build wallet object if connected
  // Functions are created inside useMemo to avoid needing refs
  const wallet: ActiveWallet | undefined = useMemo(() => {
    if (!activeSource) return undefined;

    const address =
      activeSource === 'privy'
        ? embeddedAddress
        : activeSource === 'reown'
          ? reownAddress
          : undefined;

    if (!address) return undefined;

    const type: WalletType = activeSource === 'privy' ? 'privy' : 'external';

    const name =
      activeSource === 'privy'
        ? 'Privy Wallet'
        : activeSource === 'reown'
          ? walletInfo?.name || 'External Wallet'
          : 'Unknown Wallet';

    /**
     * Get the ethers.js BrowserProvider for the currently selected wallet.
     *
     * @returns BrowserProvider instance
     * @throws Error if no wallet is connected or provider cannot be obtained
     */
    const getProvider = async (): Promise<BrowserProvider> => {
      try {
        if (activeSource === 'privy' && embeddedWallet) {
          // Privy embedded wallet - use getProvider() for React Native
          const eip1193Provider = await embeddedWallet.getProvider();
          return new BrowserProvider(eip1193Provider);
        } else if (activeSource === 'reown' && reownProvider) {
          // Reown external wallet
          return new BrowserProvider(reownProvider as any);
        }
        throw new Error('No active wallet connected');
      } catch (error) {
        console.error('Failed to get provider:', error);
        throw error;
      }
    };

    /**
     * Switch to a different blockchain network
     *
     * @param chainId - The chain ID to switch to (e.g., 42161 for Arbitrum)
     * @throws Error if switching fails or wallet doesn't support it
     */
    const switchChain = async (chainId: number): Promise<void> => {
      try {
        const chainIdHex = `0x${chainId.toString(16)}`; // Convert to hex

        if (activeSource === 'privy' && embeddedWallet) {
          // Privy: Use provider.request with wallet_switchEthereumChain
          const provider = await embeddedWallet.getProvider();
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
          });
          console.log(`Switched to chain ${chainId} (${chainIdHex}) via Privy`);
        } else if (activeSource === 'reown' && reownProvider) {
          // Reown: Use provider.request with wallet_switchEthereumChain
          // The provider should support EIP-1193 standard methods
          if (!(reownProvider as any).request) {
            throw new Error('Provider does not support network switching');
          }

          await (reownProvider as any).request({
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
    };

    return {
      address,
      name,
      type,
      getProvider,
      switchChain,
    };
  }, [
    activeSource,
    embeddedAddress,
    reownAddress,
    embeddedWallet,
    reownProvider,
    walletInfo?.name,
  ]);

  return useMemo(
    () => ({
      isReady,
      wallet,
    }),
    [isReady, wallet],
  );
}
