import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import { useAccount, useWalletInfo, useAppKit } from '@reown/appkit-react-native';
import { useMemo, useCallback, useEffect, useRef } from 'react';
import {
  useWalletSourceStore,
  type WalletSource,
} from '@/lib/riverrun/wallet/useWalletSourceStore';

export interface AvailableWallet {
  source: WalletSource;
  address: string;
  name: string;
  isConnected: boolean;
}

export interface UseWalletManagerResult {
  // Available wallets list
  availableWallets: AvailableWallet[];

  // Current selection
  selectedWalletSource: WalletSource | undefined;

  // Switch wallet
  switchWallet: (source: WalletSource) => void;

  // Privy operations
  connectPrivy: () => Promise<unknown>;
  disconnectPrivy: () => Promise<void>;

  // Reown operations
  connectReown: () => void;
  disconnectReown: () => void;
}

/**
 * Wallet Manager Hook
 *
 * Manages the list of available wallets, user selection, and connection/disconnection.
 * Automatically switches to Reown wallet when it connects successfully.
 *
 * @example
 * ```tsx
 * const {
 *   availableWallets,
 *   selectedWalletSource,
 *   switchWallet,
 *   connectPrivy,
 *   connectReown,
 * } = useWalletManager();
 * ```
 */
export function useWalletManager(): UseWalletManagerResult {
  // Wallet store
  const { selectedWalletSource, setSelectedWalletSource, clearSelection } = useWalletSourceStore();

  // Privy hooks
  const { user, logout: privyLogout } = usePrivy();
  const { wallets: embeddedWallets } = useEmbeddedEthereumWallet();
  const { login: privyLogin } = useLogin();

  // Reown hooks
  const { address: reownAddress, isConnected } = useAccount();
  const { walletInfo } = useWalletInfo();
  const { open: openReownModal, disconnect: reownDisconnect } = useAppKit();

  // Get wallet information
  const embeddedWallet = embeddedWallets?.[0];
  const embeddedAddress = embeddedWallet?.address;

  // Build available wallets list
  const availableWallets: AvailableWallet[] = useMemo(() => {
    const wallets: AvailableWallet[] = [];

    if (embeddedAddress) {
      wallets.push({
        source: 'privy',
        address: embeddedAddress,
        name: 'Privy Wallet',
        isConnected: true,
      });
    }

    if (isConnected && reownAddress) {
      wallets.push({
        source: 'reown',
        address: reownAddress,
        name: walletInfo?.name || 'External Wallet',
        isConnected: true,
      });
    }

    return wallets;
  }, [embeddedAddress, isConnected, reownAddress, walletInfo]);

  // Auto-switch to Reown wallet when it connects
  const prevIsConnected = useRef(isConnected);
  useEffect(() => {
    // Check if Reown just connected (transition from false to true)
    if (!prevIsConnected.current && isConnected) {
      // Auto-switch to the newly connected Reown wallet
      setSelectedWalletSource('reown');
    }
    // Update the previous state
    prevIsConnected.current = isConnected;
  }, [isConnected, setSelectedWalletSource]);

  /**
   * Switch to a different wallet
   */
  const switchWallet = useCallback(
    (source: WalletSource) => {
      setSelectedWalletSource(source);
    },
    [setSelectedWalletSource],
  );

  /**
   * Connect via Privy (email login).
   * Opens Privy's email login modal.
   * Auto-switches to Privy wallet after successful connection.
   */
  const connectPrivy = useCallback(async () => {
    try {
      const result = await privyLogin({ loginMethods: ['email'] });
      // Auto-switch to Privy wallet after login
      if (result) {
        setSelectedWalletSource('privy');
      }
      return result;
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
  }, [privyLogin, setSelectedWalletSource]);

  /**
   * Disconnect from Privy wallet.
   * Automatically switches to another available wallet if this is the current wallet.
   */
  const disconnectPrivy = useCallback(async () => {
    // Determine if we need to switch to another wallet
    const needsSwitch = selectedWalletSource === 'privy';
    let targetWallet: WalletSource | undefined;

    if (needsSwitch) {
      // Find other available wallet to switch to
      if (isConnected) {
        targetWallet = 'reown';
      }

      // Switch before disconnecting to ensure smooth transition
      if (targetWallet) {
        setSelectedWalletSource(targetWallet);
      } else {
        // No other wallet available, will revert to login screen
        clearSelection();
      }
    }

    // Perform the disconnect
    if (user) {
      await privyLogout();
    }
  }, [
    user,
    privyLogout,
    selectedWalletSource,
    isConnected,
    setSelectedWalletSource,
    clearSelection,
  ]);

  /**
   * Connect external wallet via Reown AppKit.
   * Opens the wallet connection modal.
   * Auto-switches to Reown wallet after successful connection (via useEffect).
   */
  const connectReown = useCallback(() => {
    openReownModal();
  }, [openReownModal]);

  /**
   * Disconnect from Reown wallet.
   * Automatically switches to another available wallet if this is the current wallet.
   */
  const disconnectReown = useCallback(() => {
    // Determine if we need to switch to another wallet
    const needsSwitch = selectedWalletSource === 'reown';
    let targetWallet: WalletSource | undefined;

    if (needsSwitch) {
      // Find other available wallet to switch to
      if (embeddedAddress) {
        targetWallet = 'privy';
      }

      // Switch before disconnecting to ensure smooth transition
      if (targetWallet) {
        setSelectedWalletSource(targetWallet);
      } else {
        // No other wallet available, will revert to login screen
        clearSelection();
      }
    }

    // Perform the disconnect
    reownDisconnect();
  }, [
    selectedWalletSource,
    embeddedAddress,
    setSelectedWalletSource,
    clearSelection,
    reownDisconnect,
  ]);

  return useMemo(
    () => ({
      availableWallets,
      selectedWalletSource,
      switchWallet,
      connectPrivy,
      disconnectPrivy,
      connectReown,
      disconnectReown,
    }),
    [
      availableWallets,
      selectedWalletSource,
      switchWallet,
      connectPrivy,
      disconnectPrivy,
      connectReown,
      disconnectReown,
    ],
  );
}
