/**
 * AppCompositionProvider - Unified Composition Root
 *
 * This provider composes all bounded context providers in the correct dependency order.
 * It provides a single entry point for dependency injection across the entire application.
 *
 * Dependency Order:
 * 1. WalletCompositionProvider (no dependencies)
 * 2. AgentCompositionProvider (depends on Wallet)
 * 3. BuilderFeeCompositionProvider (depends on Wallet)
 * ... (future contexts)
 */

import React from 'react';

import { WalletCompositionProvider } from '../contexts/wallet/reactNative/walletComposition';
import { AgentCompositionProvider } from '../contexts/agent/reactNative/agentComposition';
import { BuilderFeeCompositionProvider } from '../contexts/builderFee/reactNative/builderFeeComposition';

interface AppCompositionProviderProps {
  children: React.ReactNode;
}

/**
 * AppCompositionProvider
 *
 * Composes all bounded context providers in the correct order.
 * Add new context providers here as the application grows.
 *
 * @example
 * ```tsx
 * <AppCompositionProvider>
 *   <TamaguiProvider>
 *     <YourApp />
 *   </TamaguiProvider>
 * </AppCompositionProvider>
 * ```
 */
export function AppCompositionProvider({ children }: AppCompositionProviderProps) {
  return (
    <WalletCompositionProvider>
      <AgentCompositionProvider>
        <BuilderFeeCompositionProvider>{children}</BuilderFeeCompositionProvider>
      </AgentCompositionProvider>
    </WalletCompositionProvider>
  );
}
