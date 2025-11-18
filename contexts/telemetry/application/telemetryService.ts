/**
 * Telemetry Service
 *
 * Core business logic for telemetry operations.
 * Implements the TelemetryPort interface and coordinates between
 * Sentry and Segment.
 *
 * Design:
 * - Unified API that abstracts Sentry/Segment specifics
 * - Type-safe event tracking to prevent event sprawl
 * - Automatic user identification via wallet connection
 * - Sentry: Error tracking, performance monitoring, selective breadcrumbs
 * - Segment: Analytics events forwarded to Amplitude and other destinations
 */

import type { SegmentAdapter } from '../adapters/segmentAdapter';
import type { SentryAdapter } from '../adapters/sentryAdapter';
import type { TelemetryPort } from '../ports/telemetryPort';
import type {
  ScreenName,
  ScreenProps,
  SpanContext,
  SpanName,
  TelemetryErrorContext,
  TelemetryEventName,
  TelemetryEventProps,
  TelemetryUser,
} from '../ports/types';

/**
 * Telemetry service implementation
 */
export class TelemetryService implements TelemetryPort {
  constructor(
    private readonly sentryAdapter: SentryAdapter,
    private readonly segmentAdapter: SegmentAdapter,
  ) {}

  // ==========================================================================
  // User Identification
  // ==========================================================================

  /**
   * Identify user
   * - Sentry: Set user context
   * - Segment: Call analytics.identify()
   */
  async identifyUser(user: TelemetryUser): Promise<void> {
    // Identify in Sentry
    this.sentryAdapter.identifyUser(user);

    // Identify in Segment
    this.segmentAdapter.identify(user);
  }

  /**
   * Reset user identification
   * - Sentry: Clear user
   * - Segment: Call analytics.reset()
   */
  async resetUser(): Promise<void> {
    // Clear in Sentry
    this.sentryAdapter.clearUser();

    // Reset in Segment
    this.segmentAdapter.reset();
  }

  // ==========================================================================
  // Event Tracking
  // ==========================================================================

  /**
   * Track event
   * - Segment: Primary destination via analytics.track()
   * - Sentry: Important events also logged as breadcrumbs
   */
  async trackEvent<E extends TelemetryEventName>(
    event: E,
    props: TelemetryEventProps[E],
  ): Promise<void> {
    // Send all events to Segment (forwarded to Amplitude and other destinations)
    this.segmentAdapter.track(event, props);

    // Add important events to Sentry breadcrumbs (for error context)
    this.sentryAdapter.trackEventAsBreadcrumb(event, props);
  }

  // ==========================================================================
  // Screen Tracking
  // ==========================================================================

  /**
   * Track screen view
   * - Segment: analytics.screen()
   * - Sentry: Set tag for error filtering
   */
  async trackScreen<S extends ScreenName>(screen: S, props: ScreenProps[S]): Promise<void> {
    // Track screen view in Segment
    this.segmentAdapter.screen(screen, props);

    // Set screen context in Sentry for error filtering
    this.sentryAdapter.setScreenContext(screen, props as Record<string, unknown>);
  }

  // ==========================================================================
  // Error Tracking
  // ==========================================================================

  /**
   * Capture error
   * - Sentry: Capture exception
   * - Segment: Not sent (errors are tracked in Sentry only)
   */
  async captureError(error: unknown, context?: TelemetryErrorContext): Promise<void> {
    // Capture in Sentry (errors are not sent to Segment)
    this.sentryAdapter.captureError(error, context);
  }

  /**
   * Capture warning
   * - Sentry: Capture message with warning level
   * - Segment: Not sent (errors only)
   */
  async captureWarning(message: string, context?: TelemetryErrorContext): Promise<void> {
    // Capture in Sentry
    this.sentryAdapter.captureWarning(message, context);

    // Segment: Warnings are not tracked in analytics
  }

  // ==========================================================================
  // Performance Tracking
  // ==========================================================================

  /**
   * Execute function within a performance span
   * - Sentry: startSpan for performance monitoring
   * - Segment: Not applicable
   */
  async withSpan<T>(spanName: SpanName, fn: () => Promise<T>, context?: SpanContext): Promise<T> {
    return await this.sentryAdapter.withSpan(spanName, fn, context);
  }
}
