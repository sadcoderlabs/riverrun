/**
 * AppCompositionProvider - Unified Composition Root
 *
 * This provider now uses a hybrid architecture:
 * 1. TelemetryCompositionProvider - Telemetry initialization (React Context)
 * 2. WalletCompositionProvider - Wallet management with Privy/Reown hooks (React Context)
 * 3. AppServicesProvider - All other services via DI Container (Awilix)
 *
 * Architecture Migration:
 * - BEFORE: 11+ nested React Context providers
 * - AFTER: 3 providers (Telemetry + Wallet + DI Container)
 *
 * Why Hybrid?
 * - TelemetryCompositionProvider: Sets up error tracking early
 * - WalletCompositionProvider: Requires React hooks (usePrivy, useAccount, etc.)
 * - AppServicesProvider: Pure business logic services via DI
 *
 * Services in DI Container:
 * - marketService, agentService, builderFeeService, referralService
 * - bridgeService, marginService, orderCommandService
 * - Subscriptions: History, Order, Position (managed internally)
 */

import React from 'react';

import { TelemetryCompositionProvider } from '../contexts/telemetry/reactNative/telemetryComposition';
import { WalletCompositionProvider } from '../contexts/wallet/reactNative/walletComposition';
import { AppServicesProvider } from '../di';

interface AppCompositionProviderProps {
  children: React.ReactNode;
}

/**
 * AppCompositionProvider
 *
 * The main composition root for the application.
 * Uses a hybrid architecture combining React Context and DI Container.
 *
 * @example
 * ```tsx
 * <AppCompositionProvider>
 *   <TamaguiProvider>
 *     <YourApp />
 *   </TamaguiProvider>
 * </AppCompositionProvider>
 * ```
 *
 * Accessing Services:
 * ```tsx
 * import { useContainer } from '@/core/di';
 *
 * function MyComponent() {
 *   const marketService = useContainer(c => c.marketService);
 *   const orderCommandService = useContainer(c => c.orderCommandService);
 *   // ...
 * }
 * ```
 */
export function AppCompositionProvider({ children }: AppCompositionProviderProps) {
  return (
    <TelemetryCompositionProvider>
      <WalletCompositionProvider>
        <AppServicesProvider>{children}</AppServicesProvider>
      </WalletCompositionProvider>
    </TelemetryCompositionProvider>
  );
}
