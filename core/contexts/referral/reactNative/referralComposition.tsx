import React, { createContext, useContext, useMemo } from 'react';

import { ReferralService } from '../application/referralService';
import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
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
    // Create Hyperliquid gateway (unified infrastructure gateway)
    const hyperliquidGateway = new HyperliquidGateway();

    // ReferralService depends on WalletPort and HyperliquidGateway
    return new ReferralService(walletService, hyperliquidGateway);
  }, [walletService]);

  const value = useMemo(
    () => ({
      referralService,
    }),
    [referralService],
  );

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
