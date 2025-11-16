/**
 * AppServicesProvider - React wrapper for DI Container
 *
 * This provider:
 * 1. Gets WalletService from React Context (WalletCompositionProvider)
 * 2. Creates the DI container with all services
 * 3. Runs subscription hooks internally (History, Order, Position)
 * 4. Initializes services that need lifecycle management
 * 5. Provides container access via useContainer hook
 *
 * Design: Hybrid Architecture
 * - WalletService: React Context (due to hook dependencies)
 * - All other services: DI Container (pure business logic)
 * - Subscriptions: React hooks (need useEffect lifecycle)
 */

import React, { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';

import { createAppContainer } from './container';
import type { AppContainer, AppCradle } from './types';

// Wallet Context (external dependency)
import { useWalletComposition } from '../features/wallet/components/walletComposition';

// Subscription hooks (run internally)
import { useHistorySubscription } from '../../contexts/history/reactNative/useHistorySubscription';
import { useOrderSubscription } from '../../contexts/order/reactNative/useOrderSubscription';
import { usePositionSubscription } from '../../contexts/position/reactNative/usePositionSubscription';

// ============================================================================
// Context Definition
// ============================================================================

/**
 * App Container Context
 * Provides access to the DI container throughout the React tree
 */
const AppContainerContext = createContext<AppContainer | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface AppServicesProviderProps {
  children: ReactNode;
}

/**
 * AppServicesProvider
 *
 * The main composition root for the application.
 * Replaces the previous nested provider tree with a single DI container.
 *
 * Provider Hierarchy:
 * ```
 * <WalletCompositionProvider>  (must be parent - provides walletService)
 *   <AppServicesProvider>
 *     {children}
 *   </AppServicesProvider>
 * </WalletCompositionProvider>
 * ```
 *
 * Services Available:
 * - telemetryService
 * - marketService
 * - agentService
 * - builderFeeService
 * - referralService
 * - bridgeService
 * - marginService
 * - orderCommandService
 *
 * @example
 * ```tsx
 * // In your component
 * const marketService = useContainer(c => c.marketService);
 * const orderCommandService = useContainer(c => c.orderCommandService);
 * ```
 */
export function AppServicesProvider({ children }: AppServicesProviderProps) {
  // ==========================================================================
  // Get WalletService from React Context
  // ==========================================================================

  const { walletService } = useWalletComposition();

  // ==========================================================================
  // Create DI Container
  // ==========================================================================

  const container = useMemo(() => {
    return createAppContainer({ walletService });
  }, [walletService]);

  // ==========================================================================
  // Initialize Services
  // ==========================================================================

  useEffect(() => {
    // Initialize MarketService: Load market data on mount
    const marketService = container.resolve('marketService');
    marketService.loadMarkets();

    // Initialize MarginService: Start subscription lifecycle
    const marginService = container.resolve('marginService');
    marginService.start();

    // Cleanup on unmount
    return () => {
      marginService.stop();
    };
  }, [container]);

  // ==========================================================================
  // Run Subscription Hooks
  // ==========================================================================

  // History subscription (auto-manages history fills)
  useHistorySubscription();

  // Order subscription (auto-manages open orders)
  useOrderSubscription();

  // Position subscription (auto-manages open positions)
  // Note: Needs MarketService for enrichment
  const marketService = container.resolve('marketService');
  usePositionSubscription(marketService);

  // ==========================================================================
  // Provide Container
  // ==========================================================================

  return <AppContainerContext.Provider value={container}>{children}</AppContainerContext.Provider>;
}

// ============================================================================
// Container Access Hook
// ============================================================================

/**
 * useContainer - Access services from the DI container
 *
 * This hook provides type-safe access to any service in the container.
 * Use a resolver function to extract the specific service you need.
 *
 * @param resolver - Function that extracts a service from the cradle
 * @returns The resolved service
 *
 * @example
 * ```tsx
 * // Get a single service
 * const marketService = useContainer(c => c.marketService);
 *
 * // Get multiple services (returns object)
 * const { orderCommandService, marketService } = useContainer(c => ({
 *   orderCommandService: c.orderCommandService,
 *   marketService: c.marketService,
 * }));
 * ```
 */
export function useContainer<T>(resolver: (cradle: AppCradle) => T): T {
  const container = useContext(AppContainerContext);

  if (!container) {
    throw new Error('useContainer must be used within AppServicesProvider');
  }

  // Memoize the resolved value to maintain referential stability
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => resolver(container.cradle), [container]);
}
