/**
 * Position Composition - React Dependency Injection
 *
 * This file wires up the position context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect, useContext } from 'react';
import { HyperliquidGateway } from '@/core/infra/hyperliquid/hyperliquidGateway';
import { PositionService } from '../application/positionService';
import type { PositionPort } from '../ports/positionPort';
import { MarketContext } from '../../market/reactNative/marketComposition';

/**
 * Position Context Type
 */
interface PositionContextType {
  positionService: PositionPort;
}

/**
 * Position Context
 */
export const PositionContext = createContext<PositionContextType | undefined>(undefined);

/**
 * Position Composition Provider Props
 */
interface PositionCompositionProviderProps {
  children: React.ReactNode;
}

/**
 * Position Composition Provider
 *
 * Sets up the dependency graph:
 *
 * Infrastructure Layer:
 * - HyperliquidGateway: Unified data access with HTTP + WS hybrid strategy (self-contained)
 *
 * Domain Dependencies:
 * - MarketService: Accessed via MarketContext (injected dependency)
 *
 * Domain Layer:
 * - PositionService: Core business logic
 *
 * The PositionService autonomously monitors active wallet changes
 * and manages position subscriptions internally.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // Get MarketService from MarketContext (dependency injection)
  const marketContext = useContext(MarketContext);

  if (!marketContext) {
    throw new Error('PositionCompositionProvider must be used within MarketCompositionProvider');
  }

  const { marketService } = marketContext;

  // Create service instances (stable across renders)
  const positionService = useMemo(() => {
    // Infrastructure: Gateway handles data access (self-contained)
    const hyperliquidGateway = new HyperliquidGateway();

    // Domain: Service with injected market service dependency
    return new PositionService(hyperliquidGateway, marketService);
  }, [marketService]);

  // Manage service lifecycle
  useEffect(() => {
    // Start the service (begins monitoring wallet changes)
    positionService.start();

    return () => {
      // Stop the service (cleanup subscriptions)
      positionService.stop();
    };
  }, [positionService]);

  const value = useMemo(
    () => ({
      positionService,
    }),
    [positionService],
  );

  return <PositionContext.Provider value={value}>{children}</PositionContext.Provider>;
}
