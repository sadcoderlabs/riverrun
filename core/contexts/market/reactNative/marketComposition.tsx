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
 * - HyperliquidGateway: Unified data access
 *   - HTTP fetch for market data
 *   - Corresponds to Hyperliquid API: fetchMetaAndAssetCtxs
 *
 * Domain Layer:
 * - MarketService: Core business logic
 *   - Loads market data from Hyperliquid API
 *   - Handles business logic (convertRawMarket)
 *   - Manages selected market and favorites
 *   - Updates marketStore (persisted to AsyncStorage)
 *
 * State Management:
 * - marketStore: Zustand vanilla store with AsyncStorage persistence
 *   - Persists: markets, selectedMarket, favorites
 *   - Used by both MarketService and React components
 *
 * Note: Real-time price updates are handled by MarketSelectorModal directly.
 */
export function MarketCompositionProvider({ children }: MarketCompositionProviderProps) {
  // Create service instances (stable across renders)
  const marketService = useMemo(() => {
    // Infrastructure: Gateway for unified Hyperliquid data access
    const hyperliquidGateway = new HyperliquidGateway();

    // Domain: Service with gateway dependency
    return new MarketService(hyperliquidGateway);
  }, []);

  // Load initial market data
  useEffect(() => {
    // Load market data on mount
    marketService.loadMarkets();
  }, [marketService]);

  const value = useMemo(
    () => ({
      marketService,
    }),
    [marketService],
  );

  return <MarketContext.Provider value={value}>{children}</MarketContext.Provider>;
}
