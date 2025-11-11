import React, { createContext, useContext, useMemo, useEffect } from 'react';
import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import { useAccount, useWalletInfo, useProvider, useAppKit } from '@reown/appkit-react-native';

import { PrivyWalletAdapter } from '../adapters/privyWalletAdapter';
import { ReownWalletAdapter } from '../adapters/reownWalletAdapter';
import { WalletService } from '../application/walletService';
import { activeWalletStore } from '../adapters/activeWalletStore';
import type { WalletPort } from '../ports/walletPort';

interface WalletCompositionContextValue {
  /**
   * Wallet service for business operations.
   * Always available when the provider has rendered children.
   */
  walletService: WalletPort;
}

const WalletCompositionContext = createContext<WalletCompositionContextValue | undefined>(
  undefined,
);

/**
 * WalletCompositionProvider - Dependency Injection Container
 *
 * This is the composition root for the wallet context in hexagonal architecture.
 * It wires together:
 * - External dependencies (Privy and Reown SDKs via React hooks)
 * - Adapters (wrapping external SDKs)
 * - Application service (core business logic)
 *
 * This provider should be placed inside PrivyProvider and AppKit in the app layout.
 *
 * @example
 * ```tsx
 * <PrivyProvider>
 *   <AppKit>
 *     <WalletCompositionProvider>
 *       <YourApp />
 *     </WalletCompositionProvider>
 *   </AppKit>
 * </PrivyProvider>
 * ```
 */
export function WalletCompositionProvider({ children }: { children: React.ReactNode }) {
  // ==========================
  // External Dependencies (React Hooks)
  // ==========================

  // Privy hooks
  const { user, logout: privyLogout, isReady: privyReady } = usePrivy();
  const { wallets: embeddedWallets } = useEmbeddedEthereumWallet();
  const { login: privyLogin } = useLogin();

  // Reown hooks
  const { address: reownAddress, isConnected } = useAccount();
  const { walletInfo } = useWalletInfo();
  const { provider: reownProvider } = useProvider();
  const { open: openReownModal, disconnect: reownDisconnect } = useAppKit();

  // ==========================
  // Compose Dependencies (Hexagonal Architecture)
  // ==========================

  const walletService = useMemo(() => {
    // Create Privy adapter with hooks data
    const embeddedWallet = embeddedWallets?.[0];
    const privyAdapter = new PrivyWalletAdapter({
      embeddedWallet: embeddedWallet
        ? {
            address: embeddedWallet.address,
            getProvider: () => embeddedWallet.getProvider(),
          }
        : undefined,
      user,
      login: privyLogin,
      logout: privyLogout,
    });

    // Create Reown adapter with hooks data
    const reownAdapter = new ReownWalletAdapter({
      address: reownAddress,
      isConnected,
      walletInfo,
      provider: reownProvider,
      openModal: openReownModal,
      disconnect: reownDisconnect,
    });

    // Create wallet service with both adapters
    // Note: WalletService uses vanilla Zustand store directly, no need to pass store functions
    return new WalletService(privyAdapter, reownAdapter);
  }, [
    embeddedWallets,
    user,
    privyLogin,
    privyLogout,
    reownAddress,
    isConnected,
    walletInfo,
    reownProvider,
    openReownModal,
    reownDisconnect,
  ]);

  // ==========================
  // Initialize and handle state changes (business logic in service)
  // ==========================

  // Initialize active wallet store when walletService is created/updated
  useEffect(() => {
    // Sync active wallet to store on mount and when walletService changes
    walletService.active().then(wallet => {
      activeWalletStore.getState().setWallet(wallet);
    });
  }, [walletService]);

  // Handle connection state changes
  useEffect(() => {
    walletService.handleConnectionStateChange();
  }, [walletService, isConnected]);

  // Don't render children until Privy is ready
  if (!privyReady) {
    return null;
  }

  const value = {
    walletService,
  };

  return (
    <WalletCompositionContext.Provider value={value}>{children}</WalletCompositionContext.Provider>
  );
}

/**
 * useWalletComposition - Access the wallet service from context
 *
 * This is an internal hook used by the public wallet hooks.
 * Components should use useWallet() or useWalletConnection() instead.
 */
export function useWalletComposition(): WalletCompositionContextValue {
  const context = useContext(WalletCompositionContext);
  if (!context) {
    throw new Error('useWalletComposition must be used within WalletCompositionProvider');
  }
  return context;
}
