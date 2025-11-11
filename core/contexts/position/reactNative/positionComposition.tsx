/**
 * Position Composition - React Dependency Injection
 *
 * This file wires up the position context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { PositionService } from '../application/positionService';
import { SubscriptionAdapter } from '../adapters/subscriptionAdapter';
import { MarketAdapter } from '../adapters/marketAdapter';
import type { PositionPort } from '../ports/positionPort';
import { useWalletComposition } from '@/core/contexts/wallet/reactNative/walletComposition';

/**
 * Position Context Type
 */
interface PositionContextType {
  positionService: PositionPort;
}

/**
 * Position Context
 */
export const PositionContext = createContext<PositionContextType | undefined>(undefined);

/**
 * Position Composition Provider Props
 */
interface PositionCompositionProviderProps {
  children: React.ReactNode;
}

/**
 * Position Composition Provider
 *
 * Sets up the dependency graph for the position context:
 * - SubscriptionAdapter (wraps SubscriptionManager)
 * - MarketAdapter (wraps market store)
 * - PositionService (core business logic)
 *
 * Also manages subscription lifecycle based on active wallet.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  const { walletService } = useWalletComposition();

  // Create service instances (stable across renders)
  const positionService = useMemo(() => {
    const subscriptionAdapter = new SubscriptionAdapter();
    const marketAdapter = new MarketAdapter();

    return new PositionService(subscriptionAdapter, marketAdapter);
  }, []);

  // Manage subscription lifecycle based on active wallet
  useEffect(() => {
    let mounted = true;

    const manageSubscription = async () => {
      try {
        const activeWallet = await walletService.active();

        if (!mounted) return;

        if (activeWallet) {
          // Start subscription when wallet is active
          await positionService.startSubscription(activeWallet.address);
        } else {
          // Stop subscription when wallet disconnects
          await positionService.stopSubscription();
        }
      } catch (error) {
        console.error('[PositionComposition] Failed to manage subscription:', error);
      }
    };

    manageSubscription();

    return () => {
      mounted = false;
      // Cleanup subscription on unmount
      positionService.stopSubscription();
    };
  }, [walletService, positionService]);

  const value = useMemo(
    () => ({
      positionService,
    }),
    [positionService],
  );

  return <PositionContext.Provider value={value}>{children}</PositionContext.Provider>;
}
