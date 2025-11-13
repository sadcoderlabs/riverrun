/**
 * Telemetry Composition Provider
 *
 * Dependency injection container for the telemetry context.
 * Wires together the Sentry adapter and telemetry service.
 */

import React, { createContext, useContext, useMemo } from 'react';

import { SentryAdapter } from '../adapters/sentryAdapter';
import { TelemetryService } from '../application/telemetryService';
import type { TelemetryPort } from '../ports/telemetryPort';

interface TelemetryCompositionContextValue {
  /**
   * Telemetry service for business operations.
   * Always available when the provider has rendered children.
   */
  telemetryService: TelemetryPort;
}

export const TelemetryCompositionContext = createContext<
  TelemetryCompositionContextValue | undefined
>(undefined);

/**
 * TelemetryCompositionProvider - Dependency Injection Container for Telemetry
 *
 * This is the composition root for the telemetry context in hexagonal architecture.
 * It wires together:
 * - SentryAdapter (external SDK wrapper)
 * - TelemetryService (core business logic)
 *
 * This provider has no dependencies and can be placed at the root of the composition tree.
 *
 * Note: Sentry must be initialized (via initializeSentry()) before this provider is rendered.
 *
 * @example
 * ```tsx
 * <TelemetryCompositionProvider>
 *   <YourApp />
 * </TelemetryCompositionProvider>
 * ```
 */
export function TelemetryCompositionProvider({ children }: { children: React.ReactNode }) {
  // ==========================
  // Compose Telemetry Service
  // ==========================

  const telemetryService = useMemo(() => {
    // Create Sentry adapter
    const sentryAdapter = new SentryAdapter();

    // Create telemetry service with Sentry adapter
    // Note: TelemetryService automatically subscribes to wallet changes in its constructor
    return new TelemetryService(sentryAdapter);
  }, []);

  const value = useMemo(
    () => ({
      telemetryService,
    }),
    [telemetryService],
  );

  return (
    <TelemetryCompositionContext.Provider value={value}>
      {children}
    </TelemetryCompositionContext.Provider>
  );
}

/**
 * useTelemetryComposition - Access the telemetry service from context
 *
 * This is an internal hook used by the public telemetry hooks.
 * Components should use useTelemetry() instead.
 */
export function useTelemetryComposition(): TelemetryCompositionContextValue {
  const context = useContext(TelemetryCompositionContext);
  if (!context) {
    throw new Error('useTelemetryComposition must be used within TelemetryCompositionProvider');
  }
  return context;
}
