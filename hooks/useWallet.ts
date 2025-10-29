import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import { useAccount, useWalletInfo, useAppKit, useProvider } from '@reown/appkit-react-native';
import { BrowserProvider, Signer } from 'ethers';
import { useMemo, useCallback } from 'react';
import { Alert } from 'react-native';

export type WalletType = 'privy' | 'external' | null;

export interface UseWalletResult {
  // Authentication state
  isAuthenticated: boolean;
  isReady: boolean;

  // Wallet information
  address: string | undefined;
  walletName: string;
  walletType: WalletType;

  // Authentication methods
  loginWithEmail: () => Promise<unknown>;
  connectWallet: () => Promise<void>;
  logout: () => Promise<void>;

  // Signing operations
  getProvider: () => Promise<BrowserProvider | null>;
  getSigner: () => Promise<Signer | null>;
}

/**
 * Unified wallet hook that abstracts Privy and Reown wallet operations.
 *
 * Priority: Privy embedded wallet > Reown external wallet
 *
 * @example
 * ```tsx
 * const { isAuthenticated, address, walletName, loginWithEmail } = useWallet();
 *
 * if (!isAuthenticated) {
 *   return <Button onPress={loginWithEmail}>Login</Button>;
 * }
 *
 * return <Text>Connected: {address}</Text>;
 * ```
 */
export function useWallet(): UseWalletResult {
  // Privy hooks
  const { isReady: privyReady, user, logout: privyLogout } = usePrivy();
  const { wallets: embeddedWallets } = useEmbeddedEthereumWallet();
  const { login: privyLogin } = useLogin();

  // Reown hooks
  const { address: reownAddress, isConnected } = useAccount();
  const { walletInfo } = useWalletInfo();
  const { provider: reownProvider } = useProvider();
  const { open: openReownModal } = useAppKit();

  // Determine primary wallet (Privy has priority)
  const embeddedWallet = embeddedWallets?.[0];
  const embeddedAddress = embeddedWallet?.address;

  // Wallet information with priority logic
  const address = embeddedAddress || reownAddress;
  const walletType: WalletType = embeddedAddress ? 'privy' : isConnected ? 'external' : null;
  const walletName = embeddedAddress ? 'Privy Wallet' : walletInfo?.name || 'Unknown Wallet';

  // Authentication state
  const isAuthenticated = !!user || isConnected;
  const isReady = privyReady;

  /**
   * Login with email via Privy.
   * Opens Privy's email login modal.
   */
  const loginWithEmail = useCallback(async () => {
    try {
      return await privyLogin({ loginMethods: ['email'] });
    } catch (error: any) {
      // Check if user cancelled the modal
      const errorMessage = error?.message || error?.toString() || '';
      const isCancelled =
        errorMessage.includes('cancelled') ||
        errorMessage.includes('dismissed') ||
        errorMessage.includes('closed') ||
        errorMessage.includes('User cancelled') ||
        error?.code === 'USER_CANCELLED';

      // Re-throw if it's not a cancellation
      if (!isCancelled) {
        throw error;
      }
      return undefined;
    }
  }, [privyLogin]);

  /**
   * Connect external wallet via Reown AppKit.
   * Opens the wallet connection modal.
   */
  const connectWallet = useCallback(async () => {
    openReownModal();
  }, [openReownModal]);

  /**
   * Logout from both Privy and disconnect Reown wallet.
   * Shows a confirmation dialog before proceeding.
   */
  const logout = useCallback(async () => {
    return new Promise<void>(resolve => {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(),
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              // Logout from Privy if logged in
              if (user) {
                await privyLogout();
              }

              // Disconnect Reown wallet if connected
              if (isConnected) {
                // Open AppKit modal for user to disconnect
                openReownModal();
              }

              resolve();
            } catch (error) {
              console.error('Logout error:', error);
              resolve();
            }
          },
        },
      ]);
    });
  }, [user, isConnected, privyLogout, openReownModal]);

  /**
   * Get the ethers.js BrowserProvider for the current wallet.
   *
   * @returns BrowserProvider instance or null if no wallet is connected
   */
  const getProvider = useCallback(async (): Promise<BrowserProvider | null> => {
    try {
      if (embeddedWallet) {
        // Privy embedded wallet - use getProvider() for React Native
        const eip1193Provider = await embeddedWallet.getProvider();
        return new BrowserProvider(eip1193Provider);
      } else if (reownProvider) {
        // Reown external wallet
        return new BrowserProvider(reownProvider as any);
      }
      return null;
    } catch (error) {
      console.error('Failed to get provider:', error);
      return null;
    }
  }, [embeddedWallet, reownProvider]);

  /**
   * Get the ethers.js Signer for the current wallet.
   *
   * @returns Signer instance or null if no wallet is connected
   */
  const getSigner = useCallback(async (): Promise<Signer | null> => {
    try {
      const provider = await getProvider();
      if (!provider) return null;

      const signer = await provider.getSigner();
      return signer;
    } catch (error) {
      console.error('Failed to get signer:', error);
      return null;
    }
  }, [getProvider]);

  return useMemo(
    () => ({
      isAuthenticated,
      isReady,
      address,
      walletName,
      walletType,
      loginWithEmail,
      connectWallet,
      logout,
      getProvider,
      getSigner,
    }),
    [
      isAuthenticated,
      isReady,
      address,
      walletName,
      walletType,
      loginWithEmail,
      connectWallet,
      logout,
      getProvider,
      getSigner,
    ],
  );
}
