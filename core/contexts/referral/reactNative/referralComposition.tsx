import React, { createContext, useContext, useMemo } from 'react';

import { ReferralService } from '../application/referralService';
import { HyperliquidAdapter } from '../../../infra/hyperliquid/hyperliquidAdapter';
import type { ReferralPort } from '../ports/referralPort';
import { useWalletComposition } from '@/core/contexts/wallet/reactNative/walletComposition';

interface ReferralCompositionContextValue {
  /**
   * Referral service for business operations.
   * Always available when the provider has rendered children.
   */
  referralService: ReferralPort;
}

const ReferralCompositionContext = createContext<ReferralCompositionContextValue | undefined>(
  undefined,
);

/**
 * ReferralCompositionProvider - Dependency Injection Container for Referral
 *
 * This is the composition root for the referral context in hexagonal architecture.
 * It wires together:
 * - Wallet dependencies (via WalletCompositionProvider)
 * - Referral service (core business logic)
 *
 * This provider should be placed inside WalletCompositionProvider.
 *
 * @example
 * ```tsx
 * <WalletCompositionProvider>
 *   <ReferralCompositionProvider>
 *     <YourApp />
 *   </ReferralCompositionProvider>
 * </WalletCompositionProvider>
 * ```
 */
export function ReferralCompositionProvider({ children }: { children: React.ReactNode }) {
  const { walletService } = useWalletComposition();

  // ==========================
  // Compose Referral Service
  // ==========================

  const referralService = useMemo(() => {
    // Create Hyperliquid adapter (shared infrastructure adapter)
    const hyperliquidAdapter = new HyperliquidAdapter();

    // ReferralService depends on WalletPort and HyperliquidAdapter
    return new ReferralService(walletService, hyperliquidAdapter);
  }, [walletService]);

  const value = {
    referralService,
  };

  return (
    <ReferralCompositionContext.Provider value={value}>
      {children}
    </ReferralCompositionContext.Provider>
  );
}

/**
 * useReferralComposition - Access the referral service from context
 *
 * This is an internal hook used by the public referral hooks.
 * Components should use useReferralContext() instead.
 */
export function useReferralComposition(): ReferralCompositionContextValue {
  const context = useContext(ReferralCompositionContext);
  if (!context) {
    throw new Error('useReferralComposition must be used within ReferralCompositionProvider');
  }
  return context;
}
