/**
 * Margin Composition - Dependency Injection Container
 *
 * Provides MarginService instance to React components via Context.
 */

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { MarginService } from '../application/marginService';
import type { MarginPort } from '../ports/marginPort';
import { useWalletComposition } from '../../wallet/reactNative/walletComposition';
import { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';

/**
 * Margin composition context value
 */
interface MarginCompositionContext {
  marginService: MarginPort;
}

/**
 * Margin composition context
 */
export const MarginContext = createContext<MarginCompositionContext | undefined>(undefined);

/**
 * Margin composition provider props
 */
interface MarginCompositionProviderProps {
  children: React.ReactNode;
}

/**
 * Margin Composition Provider
 *
 * Creates MarginService instance and starts it automatically.
 * Stops service on unmount.
 */
export function MarginCompositionProvider({ children }: MarginCompositionProviderProps) {
  const { walletService } = useWalletComposition();

  // Create service instance (only once)
  const marginService = useMemo(() => {
    const hyperliquidGateway = new HyperliquidGateway();
    return new MarginService(walletService, hyperliquidGateway);
  }, [walletService]);

  // Start service on mount, stop on unmount
  useEffect(() => {
    marginService.start();

    return () => {
      marginService.stop();
    };
  }, [marginService]);

  const value = useMemo(
    () => ({
      marginService,
    }),
    [marginService],
  );

  return <MarginContext.Provider value={value}>{children}</MarginContext.Provider>;
}

/**
 * Hook to access margin composition context
 *
 * @throws Error if used outside MarginCompositionProvider
 */
export function useMarginComposition(): MarginCompositionContext {
  const context = useContext(MarginContext);

  if (!context) {
    throw new Error('useMarginComposition must be used within MarginCompositionProvider');
  }

  return context;
}
