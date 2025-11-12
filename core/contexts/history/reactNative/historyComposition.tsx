import React, { createContext, useContext, useMemo, useEffect } from 'react';

import { HistoryService } from '../application/historyService';
import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import type { HistoryPort } from '../ports/historyPort';

interface HistoryCompositionContextValue {
  /**
   * History service for business operations.
   * Always available when the provider has rendered children.
   */
  historyService: HistoryPort;
}

const HistoryCompositionContext = createContext<HistoryCompositionContextValue | undefined>(
  undefined,
);

/**
 * HistoryCompositionProvider - Dependency Injection Container for History
 *
 * This is the composition root for the history context in hexagonal architecture.
 * It wires together:
 * - Hyperliquid gateway (infrastructure)
 * - History service (core business logic)
 *
 * @example
 * ```tsx
 * <HistoryCompositionProvider>
 *   <YourApp />
 * </HistoryCompositionProvider>
 * ```
 */
export function HistoryCompositionProvider({ children }: { children: React.ReactNode }) {
  // ==========================
  // Compose History Service
  // ==========================

  const historyService = useMemo(() => {
    // Create Hyperliquid gateway (unified infrastructure gateway)
    const hyperliquidGateway = new HyperliquidGateway();

    // HistoryService depends on HyperliquidGateway
    return new HistoryService(hyperliquidGateway);
  }, []);

  // Manage service lifecycle
  useEffect(() => {
    // Start the service (begins monitoring wallet changes)
    historyService.start();

    return () => {
      // Stop the service (cleanup subscriptions)
      historyService.stop();
    };
  }, [historyService]);

  const value = useMemo(
    () => ({
      historyService,
    }),
    [historyService],
  );

  return (
    <HistoryCompositionContext.Provider value={value}>
      {children}
    </HistoryCompositionContext.Provider>
  );
}

/**
 * useHistoryComposition - Access the history service from context
 *
 * This is an internal hook used by the public history hooks.
 * Components should use useHistory() instead.
 */
export function useHistoryComposition(): HistoryCompositionContextValue {
  const context = useContext(HistoryCompositionContext);
  if (!context) {
    throw new Error('useHistoryComposition must be used within HistoryCompositionProvider');
  }
  return context;
}
