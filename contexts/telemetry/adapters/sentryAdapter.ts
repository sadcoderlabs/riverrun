/**
 * Sentry Adapter
 *
 * Adapter that wraps the Sentry SDK for error tracking and performance monitoring.
 * This adapter is only concerned with Sentry-specific operations.
 */

import * as Sentry from '@sentry/react-native';

import type {
  SpanContext,
  SpanName,
  TelemetryErrorContext,
  TelemetryEventName,
  TelemetryEventProps,
  TelemetryUser,
} from '../ports/types';

/**
 * Events that should be tracked as Sentry breadcrumbs
 * (subset of all telemetry events)
 */
const BREADCRUMB_EVENTS: Set<TelemetryEventName> = new Set([
  'wallet_connected',
  'wallet_disconnected',
  'order_submitted',
  'order_confirmed',
  'order_failed',
  'order_cancelled',
  'position_opened',
  'position_closed',
  'market_selected',
  'agent_approved',
  'bridge_initiated',
  'bridge_completed',
  'bridge_failed',
]);

/**
 * Map event categories for Sentry breadcrumbs
 */
function getEventCategory(event: TelemetryEventName): string {
  if (event.startsWith('wallet_')) return 'wallet';
  if (event.startsWith('order_')) return 'trading.order';
  if (event.startsWith('position_')) return 'trading.position';
  if (event.startsWith('market_') || event.startsWith('leverage_')) return 'trading.market';
  if (event.startsWith('agent_')) return 'agent';
  if (event.startsWith('builder_fee_')) return 'builder_fee';
  if (event.startsWith('referral_')) return 'referral';
  if (event.startsWith('bridge_')) return 'bridge';
  if (event.startsWith('app_')) return 'lifecycle';
  return 'user';
}

/**
 * Adapter for Sentry SDK
 */
export class SentryAdapter {
  /**
   * Identify user in Sentry
   */
  identifyUser(user: TelemetryUser): void {
    Sentry.setUser({
      id: user.address,
      username: user.address,
      // Add wallet source as extra context
      ...(user.walletSource && { walletSource: user.walletSource }),
    });
  }

  /**
   * Clear user identification
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Add event as breadcrumb if it's important for error context
   */
  trackEventAsBreadcrumb<E extends TelemetryEventName>(
    event: E,
    props: TelemetryEventProps[E],
  ): void {
    // Only track important events as breadcrumbs
    if (!BREADCRUMB_EVENTS.has(event)) {
      return;
    }

    Sentry.addBreadcrumb({
      category: getEventCategory(event),
      message: event,
      level: event.includes('failed') || event.includes('error') ? 'error' : 'info',
      data: props as Record<string, unknown>,
      timestamp: Date.now() / 1000,
    });
  }

  /**
   * Set screen context for error filtering
   */
  setScreenContext(screenName: string, props?: Record<string, unknown>): void {
    Sentry.setTag('screen', screenName);
    if (props && Object.keys(props).length > 0) {
      Sentry.setContext('screen', {
        name: screenName,
        ...props,
      });
    }
  }

  /**
   * Capture an error with context
   */
  captureError(error: unknown, context?: TelemetryErrorContext): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));

    Sentry.captureException(errorObj, scope => {
      if (context?.component) {
        scope.setTag('component', context.component);
      }
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      if (context?.tags) {
        scope.setTags(context.tags);
      }
      if (context?.extra) {
        scope.setContext('error_context', context.extra);
      }
      return scope;
    });
  }

  /**
   * Capture a warning message
   */
  captureWarning(message: string, context?: TelemetryErrorContext): void {
    Sentry.captureMessage(message, scope => {
      scope.setLevel('warning');
      if (context?.component) {
        scope.setTag('component', context.component);
      }
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      if (context?.tags) {
        scope.setTags(context.tags);
      }
      if (context?.extra) {
        scope.setContext('warning_context', context.extra);
      }
      return scope;
    });
  }

  /**
   * Execute function within a performance span
   */
  async withSpan<T>(spanName: SpanName, fn: () => Promise<T>, context?: SpanContext): Promise<T> {
    return await Sentry.startSpan(
      {
        name: spanName,
        op: 'function',
        attributes: context?.tags || {},
      },
      async () => {
        try {
          // Set additional context data if provided
          if (context?.data) {
            Sentry.setContext('span_data', context.data);
          }
          const result = await fn();
          return result;
        } catch (error) {
          Sentry.captureException(error);
          throw error;
        }
      },
    );
  }
}
