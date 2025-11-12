import React, { createContext, useContext, useMemo } from 'react';

import { useWalletComposition } from '@/core/contexts/wallet/reactNative/walletComposition';
import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import { BuilderFeeService } from '../application/builderFeeService';
import type { BuilderFeePort } from '../ports/builderFeePort';

interface BuilderFeeCompositionContextValue {
  /**
   * Builder fee service for business operations.
   * Always available when the provider has rendered children.
   */
  builderFeeService: BuilderFeePort;
}

const BuilderFeeCompositionContext = createContext<BuilderFeeCompositionContextValue | undefined>(
  undefined,
);

/**
 * BuilderFeeCompositionProvider - Dependency Injection Container for Builder Fee
 *
 * This is the composition root for the builder fee context in hexagonal architecture.
 * It wires together:
 * - Wallet dependencies (via WalletCompositionProvider)
 * - Builder fee service (core business logic)
 *
 * This provider should be placed inside WalletCompositionProvider.
 *
 * @example
 * ```tsx
 * <WalletCompositionProvider>
 *   <BuilderFeeCompositionProvider>
 *     <YourApp />
 *   </BuilderFeeCompositionProvider>
 * </WalletCompositionProvider>
 * ```
 */
export function BuilderFeeCompositionProvider({ children }: { children: React.ReactNode }) {
  const { walletService } = useWalletComposition();

  // ==========================
  // Compose Builder Fee Service
  // ==========================

  const builderFeeService = useMemo(() => {
    // Create Hyperliquid gateway (unified infrastructure gateway)
    const hyperliquidGateway = new HyperliquidGateway();

    // BuilderFeeService depends on WalletPort and HyperliquidGateway
    return new BuilderFeeService(walletService, hyperliquidGateway);
  }, [walletService]);

  const value = {
    builderFeeService,
  };

  return (
    <BuilderFeeCompositionContext.Provider value={value}>
      {children}
    </BuilderFeeCompositionContext.Provider>
  );
}

/**
 * useBuilderFeeComposition - Access the builder fee service from context
 *
 * This is an internal hook used by the public builder fee hooks.
 * Components should use useBuilderFeeContext() instead.
 */
export function useBuilderFeeComposition(): BuilderFeeCompositionContextValue {
  const context = useContext(BuilderFeeCompositionContext);
  if (!context) {
    throw new Error('useBuilderFeeComposition must be used within BuilderFeeCompositionProvider');
  }
  return context;
}
