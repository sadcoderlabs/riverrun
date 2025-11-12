/**
 * AppCompositionProvider - Unified Composition Root
 *
 * This provider composes all bounded context providers in the correct dependency order.
 * It provides a single entry point for dependency injection across the entire application.
 *
 * Dependency Order:
 * 1. WalletCompositionProvider (no dependencies)
 * 2. MarketCompositionProvider (no dependencies)
 * 3. HistoryCompositionProvider (depends on Wallet)
 * 4. AgentCompositionProvider (depends on Wallet)
 * 5. BuilderFeeCompositionProvider (depends on Wallet)
 * 6. ReferralCompositionProvider (depends on Wallet)
 * 7. PositionCompositionProvider (depends on Wallet + Market)
 * ... (future contexts)
 */

import React from 'react';

import { WalletCompositionProvider } from '../contexts/wallet/reactNative/walletComposition';
import { MarketCompositionProvider } from '../contexts/market/reactNative/marketComposition';
import { HistoryCompositionProvider } from '../contexts/history/reactNative/historyComposition';
import { AgentCompositionProvider } from '../contexts/agent/reactNative/agentComposition';
import { BuilderFeeCompositionProvider } from '../contexts/builderFee/reactNative/builderFeeComposition';
import { ReferralCompositionProvider } from '../contexts/referral/reactNative/referralComposition';
import { PositionCompositionProvider } from '../contexts/position/reactNative/positionComposition';

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
      <MarketCompositionProvider>
        <HistoryCompositionProvider>
          <AgentCompositionProvider>
            <BuilderFeeCompositionProvider>
              <ReferralCompositionProvider>
                <PositionCompositionProvider>{children}</PositionCompositionProvider>
              </ReferralCompositionProvider>
            </BuilderFeeCompositionProvider>
          </AgentCompositionProvider>
        </HistoryCompositionProvider>
      </MarketCompositionProvider>
    </WalletCompositionProvider>
  );
}
