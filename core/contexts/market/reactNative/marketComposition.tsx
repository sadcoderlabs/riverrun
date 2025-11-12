/**
 * Market Composition - React Dependency Injection
 *
 * This file wires up the market context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { MarketService } from '../application/marketService';
import { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';
import type { MarketPort } from '../ports/marketPort';

/**
 * Market Context Type
 */
interface MarketContextType {
  marketService: MarketPort;
}

/**
 * Market Context
 */
export const MarketContext = createContext<MarketContextType | undefined>(undefined);

/**
 * Market Composition Provider Props
 */
interface MarketCompositionProviderProps {
  children: React.ReactNode;
}

/**
 * Market Composition Provider
 *
 * Sets up the dependency graph:
 *
 * Infrastructure Layer:
 * - HyperliquidGateway: Unified data access with HTTP+WS hybrid strategy
 *   - HTTP fetch for immediate data (~100ms)
 *   - WebSocket subscription for realtime updates
 *   - Corresponds to Hyperliquid API: fetchMetaAndAssetCtxs, subscribeAllMids
 *
 * Domain Layer:
 * - MarketService: Core business logic
 *   - Auto-loads market data on start
 *   - Auto-subscribes to realtime price updates
 *   - Handles business logic (convertRawMarket)
 *   - Manages selected market and favorites
 *   - Updates marketStore (persisted to AsyncStorage)
 *
 * State Management:
 * - marketStore: Zustand vanilla store with AsyncStorage persistence
 *   - Persists: markets, selectedMarket, favorites
 *   - Used by both MarketService and React components
 *
 * The MarketService autonomously manages market data lifecycle.
 */
export function MarketCompositionProvider({ children }: MarketCompositionProviderProps) {
  // Create service instances (stable across renders)
  const marketService = useMemo(() => {
    // Infrastructure: Gateway for unified Hyperliquid data access
    const hyperliquidGateway = new HyperliquidGateway();

    // Domain: Service with gateway dependency
    return new MarketService(hyperliquidGateway);
  }, []);

  // Manage service lifecycle
  useEffect(() => {
    // Start the service (loads data and begins realtime updates)
    marketService.start();

    return () => {
      // Stop the service (cleanup subscriptions)
      marketService.stop();
    };
  }, [marketService]);

  const value = useMemo(
    () => ({
      marketService,
    }),
    [marketService],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
