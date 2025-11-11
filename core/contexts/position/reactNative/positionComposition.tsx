/**
 * Position Composition - React Dependency Injection
 *
 * This file wires up the position context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { WebData2Repository } from '@/core/infra/hyperliquid/repositories';
import { PositionService } from '../application/positionService';
import { MarketAdapter } from '../adapters/marketAdapter';
import type { PositionPort } from '../ports/positionPort';

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
 * - WebData2Repository: HTTP + WS hybrid strategy (self-contained)
 *
 * Adapter Layer:
 * - MarketAdapter: Market data access
 *
 * Domain Layer:
 * - PositionService: Core business logic
 *
 * The PositionService autonomously monitors active wallet changes
 * and manages position subscriptions internally.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // Create service instances (stable across renders)
  const positionService = useMemo(() => {
    // Infrastructure: Repository handles data access (self-contained)
    const webData2Repository = new WebData2Repository();

    // Adapter: Market data access
    const marketAdapter = new MarketAdapter();

    // Domain: Service with direct dependencies
    return new PositionService(webData2Repository, marketAdapter);
  }, []);

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
