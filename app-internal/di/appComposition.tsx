/**
 * AppCompositionProvider - Unified Composition Root
 *
 * This provider uses a hybrid architecture:
 * 1. WalletCompositionProvider - Wallet management with Privy/Reown hooks (React Context)
 * 2. AppServicesProvider - All services via DI Container (Awilix)
 *
 * Architecture Migration:
 * - BEFORE: 11+ nested React Context providers
 * - AFTER: 2 providers (Wallet + DI Container)
 *
 * Why Hybrid?
 * - WalletCompositionProvider: Requires React hooks (usePrivy, useAccount, etc.)
 * - AppServicesProvider: Pure business logic services via DI (including TelemetryService)
 *
 * Services in DI Container:
 * - telemetryService, marketService
 * - All context UseCases (BuilderFee, Referral, Bridge, Agent, Margin, Order)
 * - Subscriptions: History, Order, Position, Margin (managed internally)
 * - Telemetry wallet sync (managed internally)
 */

import React from 'react';

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
 *   const telemetryService = useContainer(c => c.telemetryService);
 *   // ...
 * }
 * ```
 */
export function AppCompositionProvider({ children }: AppCompositionProviderProps) {
  return (
    <WalletCompositionProvider>
      <AppServicesProvider>{children}</AppServicesProvider>
    </WalletCompositionProvider>
  );
}
