/**
 * useTelemetry Hook
 *
 * Public hook for accessing telemetry business operations.
 * Provides type-safe methods for tracking events, screens, errors, and performance.
 */

import { useCallback } from 'react';

import { useContainer } from '../../..';
import type {
  ScreenName,
  ScreenProps,
  SpanContext,
  SpanName,
  TelemetryErrorContext,
  TelemetryEventName,
  TelemetryEventProps,
  TelemetryUser,
} from '../../../../contexts/telemetry/ports/types';

export interface UseTelemetryResult {
  /**
   * Identify the current user
   * @param user User information (wallet address, etc.)
   */
  identifyUser: (user: TelemetryUser) => Promise<void>;

  /**
   * Reset user identification
   * Call this when user disconnects/logs out
   */
  resetUser: () => Promise<void>;

  /**
   * Track a user event (type-safe)
   * @param event Event name
   * @param props Event properties
   *
   * @example
   * ```ts
   * trackEvent('order_submitted', {
   *   market: 'BTC',
   *   side: 'buy',
   *   orderType: 'limit',
   *   leverage: 10,
   *   size: 1.5
   * });
   * ```
   */
  trackEvent: <E extends TelemetryEventName>(
    event: E,
    props: TelemetryEventProps[E],
  ) => Promise<void>;

  /**
   * Track screen view (type-safe)
   * @param screen Screen name
   * @param props Screen properties
   *
   * @example
   * ```ts
   * trackScreen('Trade', { market: 'BTC', tab: 'order' });
   * ```
   */
  trackScreen: <S extends ScreenName>(screen: S, props: ScreenProps[S]) => Promise<void>;

  /**
   * Capture an error
   * @param error Error object or message
   * @param context Additional context
   *
   * @example
   * ```ts
   * captureError(error, {
   *   component: 'OrderForm',
   *   action: 'submit_order',
   *   tags: { market: 'BTC' }
   * });
   * ```
   */
  captureError: (error: unknown, context?: TelemetryErrorContext) => Promise<void>;

  /**
   * Capture a warning message
   * @param message Warning message
   * @param context Additional context
   *
   * @example
   * ```ts
   * captureWarning('API rate limit approaching', {
   *   component: 'MarketData',
   *   extra: { remainingRequests: 10 }
   * });
   * ```
   */
  captureWarning: (message: string, context?: TelemetryErrorContext) => Promise<void>;

  /**
   * Track performance of an async operation
   * @param spanName Span name
   * @param fn Function to track
   * @param context Additional context
   *
   * @example
   * ```ts
   * const result = await withSpan('order_submission', async () => {
   *   return await submitOrder(params);
   * }, { data: { market: 'BTC' } });
   * ```
   */
  withSpan: <T>(spanName: SpanName, fn: () => Promise<T>, context?: SpanContext) => Promise<T>;
}

/**
 * useTelemetry - Telemetry business operations hook
 *
 * This hook provides type-safe telemetry operations.
 * All operations use predefined, typed events and screens to prevent event sprawl.
 *
 * @example
 * ```tsx
 * import { useTelemetry } from '@/app-internal/di';
 *
 * function OrderForm() {
 *   const { trackEvent, captureError } = useTelemetry();
 *
 *   const handleSubmit = async () => {
 *     try {
 *       // Track event (type-safe!)
 *       await trackEvent('order_submitted', {
 *         market: 'BTC',
 *         side: 'buy',
 *         orderType: 'limit',
 *         leverage: 10,
 *         size: 1.5
 *       });
 *
 *       await submitOrder();
 *     } catch (error) {
 *       captureError(error, {
 *         component: 'OrderForm',
 *         action: 'submit_order',
 *       });
 *     }
 *   };
 *
 *   return <Button onPress={handleSubmit}>Submit Order</Button>;
 * }
 * ```
 */
export function useTelemetry(): UseTelemetryResult {
  const telemetryService = useContainer(c => c.telemetryService);

  const identifyUser = useCallback(
    (user: TelemetryUser) => {
      return telemetryService.identifyUser(user);
    },
    [telemetryService],
  );

  const resetUser = useCallback(() => {
    return telemetryService.resetUser();
  }, [telemetryService]);

  const trackEvent = useCallback(
    <E extends TelemetryEventName>(event: E, props: TelemetryEventProps[E]) => {
      return telemetryService.trackEvent(event, props);
    },
    [telemetryService],
  );

  const trackScreen = useCallback(
    <S extends ScreenName>(screen: S, props: ScreenProps[S]) => {
      return telemetryService.trackScreen(screen, props);
    },
    [telemetryService],
  );

  const captureError = useCallback(
    (error: unknown, context?: TelemetryErrorContext) => {
      return telemetryService.captureError(error, context);
    },
    [telemetryService],
  );

  const captureWarning = useCallback(
    (message: string, context?: TelemetryErrorContext) => {
      return telemetryService.captureWarning(message, context);
    },
    [telemetryService],
  );

  const withSpan = useCallback(
    <T>(spanName: SpanName, fn: () => Promise<T>, context?: SpanContext) => {
      return telemetryService.withSpan(spanName, fn, context);
    },
    [telemetryService],
  );

  return {
    identifyUser,
    resetUser,
    trackEvent,
    trackScreen,
    captureError,
    captureWarning,
    withSpan,
  };
}
