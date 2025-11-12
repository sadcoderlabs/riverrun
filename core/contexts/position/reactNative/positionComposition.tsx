/**
 * Position Composition - Manages position data subscriptions
 *
 * This provider automatically manages position data subscriptions based on wallet lifecycle.
 * It uses the usePositionSubscription hook to handle all subscription logic.
 *
 * Dependencies:
 * - MarketService: For enriching position data with market information (markPx, szDecimals)
 */

import React, { useContext } from 'react';
import { MarketContext } from '../../market/reactNative/marketComposition';
import { usePositionSubscription } from './usePositionSubscription';

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
 * - MarketService: Accessed via MarketContext (needed for position enrichment)
 * - usePositionSubscription: Manages position data subscriptions automatically
 *
 * The subscription hook autonomously monitors wallet changes and manages
 * position subscriptions internally.
 */
export function PositionCompositionProvider({ children }: PositionCompositionProviderProps) {
  // Get MarketService from MarketContext (dependency injection)
  const marketContext = useContext(MarketContext);

  if (!marketContext) {
    throw new Error('PositionCompositionProvider must be used within MarketCompositionProvider');
  }

  const { marketService } = marketContext;

  // Manage position subscriptions automatically (pass MarketService dependency)
  usePositionSubscription(marketService);

  return <>{children}</>;
}
