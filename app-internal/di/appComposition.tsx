/**
 * AppCompositionProvider - Unified Composition Root
 *
 * This provider now uses a hybrid architecture:
 * 1. WalletCompositionProvider - Wallet management with Privy/Reown hooks (React Context)
 * 2. TelemetryCompositionProvider - Telemetry initialization (React Context, depends on Wallet)
 * 3. AppServicesProvider - All other services via DI Container (Awilix)
 *
 * Architecture Migration:
 * - BEFORE: 11+ nested React Context providers
 * - AFTER: 3 providers (Wallet + Telemetry + DI Container)
 *
 * Why Hybrid?
 * - WalletCompositionProvider: Requires React hooks (usePrivy, useAccount, etc.)
 * - TelemetryCompositionProvider: Depends on WalletCompositionProvider (uses useWallet)
 * - AppServicesProvider: Pure business logic services via DI
 *
 * Services in DI Container:
 * - marketService, agentService, builderFeeService, referralService
 * - bridgeService, marginService, orderCommandService
 * - Subscriptions: History, Order, Position (managed internally)
 */

import React from 'react';

import { TelemetryCompositionProvider } from '../features/telemetry/components/telemetryComposition';
import { WalletCompositionProvider } from '../features/wallet/components/walletComposition';
import { AppServicesProvider } from './AppServicesProvider';

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
 * import { useContainer } from '@/app-internal/di';
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
    <WalletCompositionProvider>
      <TelemetryCompositionProvider>
        <AppServicesProvider>{children}</AppServicesProvider>
      </TelemetryCompositionProvider>
    </WalletCompositionProvider>
  );
}
