/**
 * Position Composition - React Dependency Injection
 *
 * This file wires up the position context dependencies and provides them via React Context.
 * It follows the Composition Root pattern for dependency injection.
 */

import React, { createContext, useMemo, useEffect } from 'react';
import { hyperliquidSubscriptionService } from '@/core/infra/hyperliquid/subscription';
import { PositionService } from '../application/positionService';
import { SubscriptionAdapter } from '../adapters/subscriptionAdapter';
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
 * - SubscriptionAdapter (wraps HyperliquidSubscriptionService)
 * - MarketAdapter (wraps market store)
 * - PositionService (core business logic)
 *
 * The PositionService autonomously monitors active wallet changes
 * and manages position subscriptions internally.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // Create service instances (stable across renders)
  const positionService = useMemo(() => {
    const subscriptionAdapter = new SubscriptionAdapter(hyperliquidSubscriptionService);
    const marketAdapter = new MarketAdapter();

    return new PositionService(subscriptionAdapter, marketAdapter);
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
