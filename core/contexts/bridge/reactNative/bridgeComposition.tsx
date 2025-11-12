import React, { createContext, useContext, useMemo } from 'react';

import { BridgeService } from '../application/bridgeService';
import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import { useWalletComposition } from '../../wallet/reactNative/walletComposition';
import type { BridgePort } from '../ports/bridgePort';

interface BridgeCompositionContextValue {
  /**
   * Bridge service for business operations.
   * Always available when the provider has rendered children.
   */
  bridgeService: BridgePort;
}

const BridgeCompositionContext = createContext<BridgeCompositionContextValue | undefined>(
  undefined,
);

/**
 * BridgeCompositionProvider - Dependency Injection Container for Bridge
 *
 * This is the composition root for the bridge context in hexagonal architecture.
 * It wires together:
 * - Wallet service (for wallet operations)
 * - Hyperliquid gateway (for L1 operations)
 * - Bridge service (core business logic)
 *
 * @example
 * ```tsx
 * <BridgeCompositionProvider>
 *   <YourApp />
 * </BridgeCompositionProvider>
 * ```
 */
export function BridgeCompositionProvider({ children }: { children: React.ReactNode }) {
  // Get wallet service from composition
  const { walletService } = useWalletComposition();

  // ==========================
  // Compose Bridge Service
  // ==========================

  const bridgeService = useMemo(() => {
    // Create Hyperliquid gateway (unified infrastructure gateway)
    const hyperliquidGateway = new HyperliquidGateway();

    // BridgeService depends on WalletService and HyperliquidGateway
    return new BridgeService(walletService, hyperliquidGateway);
  }, [walletService]);

  const value = useMemo(
    () => ({
      bridgeService,
    }),
    [bridgeService],
  );

  return (
    <BridgeCompositionContext.Provider value={value}>{children}</BridgeCompositionContext.Provider>
  );
}

/**
 * useBridgeComposition - Access the bridge service from context
 *
 * This is an internal hook used by the public bridge hooks.
 * Components should use useBridge() instead.
 */
export function useBridgeComposition(): BridgeCompositionContextValue {
  const context = useContext(BridgeCompositionContext);
  if (!context) {
    throw new Error('useBridgeComposition must be used within BridgeCompositionProvider');
  }
  return context;
}
