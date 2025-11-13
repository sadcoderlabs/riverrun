/**
 * AppCompositionProvider - Unified Composition Root
 *
 * This provider composes all bounded context providers in the correct dependency order.
 * It provides a single entry point for dependency injection across the entire application.
 *
 * Dependency Order:
 * 1. TelemetryCompositionProvider (no dependencies - must be first for error tracking)
 * 2. WalletCompositionProvider (no dependencies)
 * 3. MarketCompositionProvider (no dependencies)
 * 4. AgentCompositionProvider (depends on Wallet)
 * 5. MarginCompositionProvider (depends on Wallet + Market + Agent)
 * 6. HistoryCompositionProvider (depends on Wallet)
 * 7. BuilderFeeCompositionProvider (depends on Wallet)
 * 8. ReferralCompositionProvider (depends on Wallet)
 * 9. BridgeCompositionProvider (depends on Wallet)
 * 10. PositionCompositionProvider (depends on Wallet + Market)
 * 11. OrderCompositionProvider (depends on Agent + BuilderFee + Market)
 * ... (future contexts)
 */

import React from 'react';

import { TelemetryCompositionProvider } from '../contexts/telemetry/reactNative/telemetryComposition';
import { WalletCompositionProvider } from '../contexts/wallet/reactNative/walletComposition';
import { MarketCompositionProvider } from '../contexts/market/reactNative/marketComposition';
import { MarginCompositionProvider } from '../contexts/margin/reactNative/marginComposition';
import { HistoryCompositionProvider } from '../contexts/history/reactNative/historyComposition';
import { AgentCompositionProvider } from '../contexts/agent/reactNative/agentComposition';
import { BuilderFeeCompositionProvider } from '../contexts/builderFee/reactNative/builderFeeComposition';
import { ReferralCompositionProvider } from '../contexts/referral/reactNative/referralComposition';
import { BridgeCompositionProvider } from '../contexts/bridge/reactNative/bridgeComposition';
import { PositionCompositionProvider } from '../contexts/position/reactNative/positionComposition';
import { OrderCompositionProvider } from '../contexts/order/reactNative/orderComposition';

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
    <TelemetryCompositionProvider>
      <WalletCompositionProvider>
        <MarketCompositionProvider>
          <AgentCompositionProvider>
            <MarginCompositionProvider>
              <HistoryCompositionProvider>
                <BuilderFeeCompositionProvider>
                  <ReferralCompositionProvider>
                    <BridgeCompositionProvider>
                      <PositionCompositionProvider>
                        <OrderCompositionProvider>{children}</OrderCompositionProvider>
                      </PositionCompositionProvider>
                    </BridgeCompositionProvider>
                  </ReferralCompositionProvider>
                </BuilderFeeCompositionProvider>
              </HistoryCompositionProvider>
            </MarginCompositionProvider>
          </AgentCompositionProvider>
        </MarketCompositionProvider>
      </WalletCompositionProvider>
    </TelemetryCompositionProvider>
  );
}
