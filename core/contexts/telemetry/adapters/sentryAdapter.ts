/**
 * Sentry Adapter
 *
 * Adapter that wraps the Sentry SDK for error tracking and breadcrumb tracking.
 */

import * as Sentry from '@sentry/react-native';
import type {
  BreadcrumbData,
  ErrorContext,
  TelemetrySeverity,
  TelemetryUser,
} from '../ports/types';

/**
 * Adapter for Sentry SDK
 */
export class SentryAdapter {
  /**
   * Identify user in Sentry
   */
  identifyUser(userId: string, user?: Partial<TelemetryUser>): void {
    Sentry.setUser({
      id: userId,
      email: user?.email,
      username: user?.username,
      ...user?.traits,
    });
  }

  /**
   * Clear user identification
   */
  clearUser(): void {
    Sentry.setUser(null);
  }

  /**
   * Capture an error with context
   */
  captureError(error: Error | string, context?: ErrorContext): void {
    const errorObj = typeof error === 'string' ? new Error(error) : error;

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
      if (context?.data) {
        scope.setContext('error_context', context.data);
      }
      return scope;
    });
  }

  /**
   * Capture a message with severity
   */
  captureMessage(message: string, level: TelemetrySeverity = 'info', context?: ErrorContext): void {
    Sentry.captureMessage(message, scope => {
      scope.setLevel(this.mapSeverityToSentry(level));
      if (context?.component) {
        scope.setTag('component', context.component);
      }
      if (context?.action) {
        scope.setTag('action', context.action);
      }
      if (context?.tags) {
        scope.setTags(context.tags);
      }
      if (context?.data) {
        scope.setContext('message_context', context.data);
      }
      return scope;
    });
  }

  /**
   * Add a breadcrumb
   */
  addBreadcrumb(breadcrumb: BreadcrumbData): void {
    Sentry.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level ? this.mapSeverityToSentry(breadcrumb.level) : undefined,
      data: breadcrumb.data,
      timestamp: breadcrumb.timestamp,
    });
  }

  /**
   * Set global context
   */
  setContext(key: string, value: Record<string, unknown>): void {
    Sentry.setContext(key, value);
  }

  /**
   * Set global tag
   */
  setTag(key: string, value: string): void {
    Sentry.setTag(key, value);
  }

  /**
   * Map our severity levels to Sentry's severity levels
   */
  private mapSeverityToSentry(severity: TelemetrySeverity): Sentry.SeverityLevel {
    const mapping: Record<TelemetrySeverity, Sentry.SeverityLevel> = {
      fatal: 'fatal',
      error: 'error',
      warning: 'warning',
      info: 'info',
      debug: 'debug',
    };
    return mapping[severity] || 'info';
  }
}
