/**
 * Position Composition - React Dependency Injection
 *
 * This file wires up the position context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { subscriptionManager } from '@/core/infra/hyperliquid/subscription';
import { WebData2Repository } from '@/core/infra/hyperliquid/repositories';
import { getInfoClient } from '@/lib/hyperliquid/client/getter';
import { PositionService } from '../application/positionService';
import { PositionDataAdapter } from '../adapters/positionDataAdapter';
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
 * Sets up the dependency graph following Repository Pattern:
 *
 * Infrastructure Layer:
 * - InfoClient: HTTP API client
 * - SubscriptionManager: WebSocket manager
 * - WebData2Repository: HTTP + WS hybrid strategy (reusable)
 *
 * Adapter Layer:
 * - PositionDataAdapter: Adapts Repository → PositionDataPort
 * - MarketAdapter: Adapts market store → MarketPort
 *
 * Domain Layer:
 * - PositionService: Core business logic (depends on Ports)
 *
 * The PositionService autonomously monitors active wallet changes
 * and manages position subscriptions internally.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // Create service instances (stable across renders)
  const positionService = useMemo(() => {
    // Infrastructure: HTTP & WebSocket clients
    const infoClient = getInfoClient();

    // Infrastructure: Repository with HTTP + WS hybrid strategy
    const webData2Repository = new WebData2Repository(infoClient, subscriptionManager);

    // Adapter: Repository → Domain Port
    const positionDataAdapter = new PositionDataAdapter(webData2Repository);
    const marketAdapter = new MarketAdapter();

    // Domain: Service depends on Ports (not concrete implementations)
    return new PositionService(positionDataAdapter, marketAdapter);
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
