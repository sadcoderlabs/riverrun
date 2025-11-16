/**
 * Telemetry Port
 *
 * Unified, type-safe interface for telemetry operations.
 * This port abstracts Sentry and Segment behind a common API.
 *
 * Design principles:
 * - Platform-agnostic: No mention of Sentry/Segment in the interface
 * - Type-safe: All events, screens, and properties are strictly typed
 * - Prevents event sprawl: Only predefined events can be tracked
 */

import type {
  ScreenName,
  ScreenProps,
  SpanContext,
  SpanName,
  TelemetryErrorContext,
  TelemetryEventName,
  TelemetryEventProps,
  TelemetryUser,
} from './types';

/**
 * Port interface for telemetry operations
 */
export interface TelemetryPort {
  // ==========================================================================
  // User Identification
  // ==========================================================================

  /**
   * Identify the current user
   * - Sets user context in Sentry
   * - Identifies user in Segment
   *
   * @param user User information (wallet address, etc.)
   */
  identifyUser(user: TelemetryUser): Promise<void>;

  /**
   * Clear user identification
   * Call this when user disconnects/logs out
   * - Clears user in Sentry
   * - Resets analytics in Segment
   */
  resetUser(): Promise<void>;

  // ==========================================================================
  // Event Tracking (primarily for Segment, selectively for Sentry breadcrumbs)
  // ==========================================================================

  /**
   * Track a user event
   * - Primary: Sent to Segment
   * - Secondary: Important events also added as Sentry breadcrumbs
   *
   * Type-safe: Only predefined events with correct properties can be tracked
   *
   * @param event Event name (type-safe union)
   * @param props Event properties (type-safe per event)
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
  trackEvent<E extends TelemetryEventName>(event: E, props: TelemetryEventProps[E]): Promise<void>;

  // ==========================================================================
  // Screen Tracking (primarily for Segment)
  // ==========================================================================

  /**
   * Track screen view
   * - Sent to Segment as screen event
   * - Sets Sentry tag for error filtering
   *
   * Type-safe: Only predefined screens with correct properties
   *
   * @param screen Screen name (type-safe union)
   * @param props Screen properties (type-safe per screen)
   *
   * @example
   * ```ts
   * trackScreen('Trade', { market: 'BTC', tab: 'order' });
   * ```
   */
  trackScreen<S extends ScreenName>(screen: S, props: ScreenProps[S]): Promise<void>;

  // ==========================================================================
  // Error Tracking (primarily for Sentry)
  // ==========================================================================

  /**
   * Capture an error
   * - Sent to Sentry for error tracking
   * - Optionally sent to Segment as 'error_occurred' event
   *
   * @param error Error object or message
   * @param context Additional context (component, action, tags, etc.)
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
  captureError(error: unknown, context?: TelemetryErrorContext): Promise<void>;

  /**
   * Capture a warning message
   * - Sent to Sentry with warning level
   * - Not sent to Segment (errors only)
   *
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
  captureWarning(message: string, context?: TelemetryErrorContext): Promise<void>;

  // ==========================================================================
  // Performance Tracking (Sentry spans)
  // ==========================================================================

  /**
   * Track performance of an async operation
   * Uses Sentry spans for performance monitoring
   *
   * @param spanName Type-safe span name
   * @param fn Async function to track
   * @param context Additional context for the span
   * @returns Result of the function
   *
   * @example
   * ```ts
   * const result = await withSpan('order_submission', async () => {
   *   return await submitOrder(params);
   * }, { data: { market: 'BTC' } });
   * ```
   */
  withSpan<T>(spanName: SpanName, fn: () => Promise<T>, context?: SpanContext): Promise<T>;

  // ==========================================================================
  // System Controls
  // ==========================================================================

  /**
   * Enable or disable telemetry
   * @param enabled Whether telemetry should be enabled
   */
  setEnabled(enabled: boolean): Promise<void>;

  /**
   * Check if telemetry is currently enabled
   */
  isEnabled(): boolean;
}
