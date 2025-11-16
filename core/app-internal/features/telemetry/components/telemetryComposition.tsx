/**
 * Telemetry Composition Provider
 *
 * Dependency injection container for the telemetry context.
 * Wires together the Sentry adapter, Segment adapter, and telemetry service.
 */

import React, { createContext, useContext, useMemo } from 'react';

import { SegmentAdapter } from '../../../../contexts/telemetry/adapters/segmentAdapter';
import { SentryAdapter } from '../../../../contexts/telemetry/adapters/sentryAdapter';
import { TelemetryService } from '../../../../contexts/telemetry/application/telemetryService';
import type { TelemetryPort } from '../../../../contexts/telemetry/ports/telemetryPort';

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
 * - SentryAdapter (error tracking and performance monitoring)
 * - SegmentAdapter (analytics events forwarded to Amplitude)
 * - TelemetryService (core business logic)
 *
 * This provider has no dependencies and can be placed at the root of the composition tree.
 *
 * Note: Sentry and Segment must be initialized (via initializeSentry() and initializeSegment())
 * before this provider is rendered.
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
    // Create Sentry adapter for error tracking and performance monitoring
    const sentryAdapter = new SentryAdapter();

    // Create Segment adapter for analytics tracking
    const segmentAdapter = new SegmentAdapter();

    // Create telemetry service with both adapters
    // Note: TelemetryService automatically subscribes to wallet changes in its constructor
    return new TelemetryService(sentryAdapter, segmentAdapter);
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
