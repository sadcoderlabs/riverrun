import React, { createContext, useContext, useMemo, useEffect, useState } from 'react';
import { usePrivy, useEmbeddedEthereumWallet } from '@privy-io/expo';
import { useLogin } from '@privy-io/expo/ui';
import { useAccount, useWalletInfo, useProvider, useAppKit } from '@reown/appkit-react-native';
import { useStore } from 'zustand';

import { PrivyWalletAdapter } from '../../../../contexts/wallet/adapters/privyWalletAdapter';
import { ReownWalletAdapter } from '../../../../contexts/wallet/adapters/reownWalletAdapter';
import { WalletService } from '../../../../contexts/wallet/application/walletService';
import { walletSelectionStore } from '../../../../contexts/wallet/adapters/walletSelectionStore';
import type { WalletPort } from '../../../../contexts/wallet/ports/walletPort';
import type { ActiveWallet } from '../../../../contexts/wallet/ports/types';

/**
 * WalletCompositionContext - Provides wallet service and active wallet state
 *
 * This context provides:
 * - walletService: For wallet operations (connect, disconnect, sign, etc.)
 * - activeWallet: Reactive state computed from walletService.active()
 *
 * Single source of truth for active wallet: walletService.active()
 */
interface WalletCompositionContextValue {
  /**
   * Wallet service for business operations.
   * Always available when the provider has rendered children.
   */
  walletService: WalletPort;

  /**
   * The currently active wallet.
   * Computed by walletService.active() and updated reactively.
   */
  activeWallet: ActiveWallet | undefined;
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
  // Active Wallet State Management (React)
  // ==========================

  // React state for active wallet (computed from walletService.active())
  const [activeWallet, setActiveWallet] = useState<ActiveWallet | undefined>(undefined);

  // Subscribe to walletSelectionStore changes
  const selectedWalletSource = useStore(walletSelectionStore, state => state.selectedWalletSource);

  // Recompute active wallet when dependencies change
  useEffect(() => {
    // Recompute when:
    // - walletService changes (adapter updates)
    // - selectedWalletSource changes (user switches wallet)
    // - isConnected changes (Reown connection state)
    // - embeddedWallets changes (Privy wallet state)
    walletService.active().then(wallet => {
      setActiveWallet(wallet);
    });
  }, [walletService, selectedWalletSource, isConnected, embeddedWallets]);

  // Handle connection state changes (business logic)
  useEffect(() => {
    walletService.handleConnectionStateChange();
  }, [walletService, isConnected]);

  // Prepare context value (must be before early return)
  const contextValue = useMemo(
    () => ({
      walletService,
      activeWallet,
    }),
    [walletService, activeWallet],
  );

  // Don't render children until Privy is ready
  if (!privyReady) {
    return null;
  }

  return (
    <WalletCompositionContext.Provider value={contextValue}>
      {children}
    </WalletCompositionContext.Provider>
  );
}

/**
 * useWalletComposition - Access wallet service and active wallet from context
 *
 * This is an internal hook that provides both:
 * - walletService: For wallet operations
 * - activeWallet: Reactive state computed from walletService.active()
 *
 * This is an internal hook. Components should use useWallet() instead.
 */
export function useWalletComposition(): WalletCompositionContextValue {
  const context = useContext(WalletCompositionContext);
  if (!context) {
    throw new Error('useWalletComposition must be used within WalletCompositionProvider');
  }
  return context;
}
