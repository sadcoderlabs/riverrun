/**
 * Telemetry Service
 *
 * Core business logic for telemetry operations.
 * Implements the TelemetryPort interface and coordinates between
 * Sentry (and future Segment integration).
 *
 * Design:
 * - Unified API that abstracts Sentry/Segment specifics
 * - Type-safe event tracking to prevent event sprawl
 * - Automatic user identification via wallet connection
 */

import { activeWalletStore } from '../../wallet/adapters/activeWalletStore';
import type { SentryAdapter } from '../adapters/sentryAdapter';
import { telemetryStore } from '../adapters/telemetryStore';
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
  constructor(private readonly sentryAdapter: SentryAdapter) {
    // Subscribe to wallet changes to auto-identify users
    this.setupWalletSubscription();
  }

  // ==========================================================================
  // User Identification
  // ==========================================================================

  /**
   * Identify user
   * - Sentry: Set user context
   * - Segment (future): Call analytics.identify()
   */
  async identifyUser(user: TelemetryUser): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // Identify in Sentry
    this.sentryAdapter.identifyUser(user);

    // TODO: When Segment is integrated, also identify there
    // segmentAdapter.identify(user.address, { walletSource: user.walletSource });
  }

  /**
   * Reset user identification
   * - Sentry: Clear user
   * - Segment (future): Call analytics.reset()
   */
  async resetUser(): Promise<void> {
    // Clear in Sentry
    this.sentryAdapter.clearUser();

    // TODO: When Segment is integrated, also reset there
    // segmentAdapter.reset();
  }

  // ==========================================================================
  // Event Tracking
  // ==========================================================================

  /**
   * Track event
   * - Segment (future): Primary destination via analytics.track()
   * - Sentry: Important events also logged as breadcrumbs
   */
  async trackEvent<E extends TelemetryEventName>(
    event: E,
    props: TelemetryEventProps[E],
  ): Promise<void> {
    if (!this.isEnabled()) {
      console.log(`[Telemetry] Event tracked (disabled): ${event}`, props);
      return;
    }

    // Add to Sentry breadcrumbs (for important events)
    this.sentryAdapter.trackEventAsBreadcrumb(event, props);

    // TODO: When Segment is integrated, send all events there
    // segmentAdapter.track(event, props);
  }

  // ==========================================================================
  // Screen Tracking
  // ==========================================================================

  /**
   * Track screen view
   * - Segment (future): analytics.screen()
   * - Sentry: Set tag for error filtering
   */
  async trackScreen<S extends ScreenName>(screen: S, props: ScreenProps[S]): Promise<void> {
    if (!this.isEnabled()) {
      return;
    }

    // Set screen context in Sentry for error filtering
    this.sentryAdapter.setScreenContext(screen, props as Record<string, unknown>);

    // TODO: When Segment is integrated, track screen view
    // segmentAdapter.screen(screen, props);
  }

  // ==========================================================================
  // Error Tracking
  // ==========================================================================

  /**
   * Capture error
   * - Sentry: Capture exception
   * - Segment (future): Optionally track as 'error_occurred' event
   */
  async captureError(error: unknown, context?: TelemetryErrorContext): Promise<void> {
    if (!this.isEnabled()) {
      console.error('[Telemetry] Error captured (telemetry disabled):', error);
      return;
    }

    // Capture in Sentry
    this.sentryAdapter.captureError(error, context);

    // TODO: When Segment is integrated, optionally track error event
    // if (shouldTrackErrorInAnalytics(error)) {
    //   segmentAdapter.track('error_occurred', {
    //     message: error.message,
    //     component: context?.component,
    //     action: context?.action,
    //   });
    // }
  }

  /**
   * Capture warning
   * - Sentry: Capture message with warning level
   * - Segment: Not sent (errors only)
   */
  async captureWarning(message: string, context?: TelemetryErrorContext): Promise<void> {
    if (!this.isEnabled()) {
      console.warn('[Telemetry] Warning captured (telemetry disabled):', message);
      return;
    }

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
    if (!this.isEnabled()) {
      return await fn();
    }

    return await this.sentryAdapter.withSpan(spanName, fn, context);
  }

  // ==========================================================================
  // System Controls
  // ==========================================================================

  /**
   * Enable or disable telemetry
   */
  async setEnabled(enabled: boolean): Promise<void> {
    telemetryStore.getState().setEnabled(enabled);
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return telemetryStore.getState().isEnabled;
  }

  // ==========================================================================
  // Private Methods
  // ==========================================================================

  /**
   * Setup subscription to wallet changes
   * Auto-identify users when wallet connects/disconnects
   */
  private setupWalletSubscription(): void {
    activeWalletStore.subscribe((state, prevState) => {
      const currentAddress = state.wallet?.address;
      const previousAddress = prevState.wallet?.address;

      // User connected wallet
      if (currentAddress && currentAddress !== previousAddress) {
        void this.identifyUser({
          address: currentAddress,
          walletSource: state.wallet?.source,
        });
      }

      // User disconnected wallet
      if (!currentAddress && previousAddress) {
        void this.resetUser();
      }
    });
  }
}
