/**
 * Market Composition - React Dependency Injection
 *
 * This file wires up the market context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { MarketService } from '../application/marketService';
import { HyperliquidMarketAdapter } from '../adapters/hyperliquidMarketAdapter';
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
 * Adapter Layer:
 * - HyperliquidMarketAdapter: Hyperliquid API and WebSocket access
 *   - Fetches market metadata (meta, assetCtxs)
 *   - Subscribes to realtime prices (allMids)
 *
 * Domain Layer:
 * - MarketService: Core business logic
 *   - Auto-loads market data on start
 *   - Auto-subscribes to realtime price updates
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
    // Adapter: Hyperliquid API and WebSocket access
    const hyperliquidAdapter = new HyperliquidMarketAdapter();

    // Domain: Service with direct dependencies
    return new MarketService(hyperliquidAdapter);
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
