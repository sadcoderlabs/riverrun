/**
 * Position Composition - React Dependency Injection
 *
 * This file wires up the position context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { subscriptionManager } from '@/core/infra/hyperliquid/subscription';
import { getInfoClient } from '@/lib/hyperliquid/client/getter';
import { PositionService } from '../application/positionService';
import { SubscriptionAdapter } from '../adapters/subscriptionAdapter';
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
 * Sets up the dependency graph for the position context:
 * - PositionDataAdapter (HTTP + WS hybrid strategy)
 *   - InfoClient (HTTP fetch)
 *   - SubscriptionAdapter (WebSocket subscription)
 * - MarketAdapter (wraps market store)
 * - PositionService (core business logic)
 *
 * The PositionService autonomously monitors active wallet changes
 * and manages position subscriptions internally.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // Create service instances (stable across renders)
  const positionService = useMemo(() => {
    const infoClient = getInfoClient();
    const subscriptionAdapter = new SubscriptionAdapter(subscriptionManager);
    const positionDataAdapter = new PositionDataAdapter(infoClient, subscriptionAdapter);
    const marketAdapter = new MarketAdapter();

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
