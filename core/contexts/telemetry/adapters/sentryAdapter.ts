/**
 * Sentry Adapter
 *
 * Adapter that wraps the Sentry SDK for error tracking, performance monitoring,
 * and breadcrumb tracking.
 */

import * as Sentry from '@sentry/react-native';
import type {
  BreadcrumbData,
  ErrorContext,
  PerformanceTransaction,
  TelemetrySeverity,
  TelemetryUser,
  TransactionHandle,
  SpanHandle,
  PerformanceSpan,
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
   * Start a performance transaction using Sentry SDK 7.x startSpanManual API
   *
   * This uses the modern Sentry API for manual span tracking.
   * The span must be manually finished by calling finish() or fail().
   */
  startTransaction(transaction: PerformanceTransaction): TransactionHandle | undefined {
    // Convert data to Sentry-compatible attributes
    const attributes: Record<string, string | number | boolean> = {};
    if (transaction.data) {
      Object.entries(transaction.data).forEach(([key, value]) => {
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
          attributes[key] = value;
        }
      });
    }
    if (transaction.tags) {
      Object.entries(transaction.tags).forEach(([key, value]) => {
        attributes[key] = value;
      });
    }

    let activeSpan: Sentry.Span | undefined;

    // Use startSpanManual for manual lifecycle control
    Sentry.startSpanManual(
      {
        name: transaction.name,
        op: transaction.operation || 'task',
        attributes,
      },
      span => {
        activeSpan = span;
        return span;
      },
    );

    if (!activeSpan) {
      return undefined;
    }

    return {
      startChild: (childSpan: PerformanceSpan): SpanHandle => {
        // Convert child span data to attributes
        const childAttributes: Record<string, string | number | boolean> = {};
        if (childSpan.data) {
          Object.entries(childSpan.data).forEach(([key, value]) => {
            if (
              typeof value === 'string' ||
              typeof value === 'number' ||
              typeof value === 'boolean'
            ) {
              childAttributes[key] = value;
            }
          });
        }

        // Start a child span using the modern API
        const span = Sentry.startInactiveSpan({
          name: childSpan.name,
          op: childSpan.operation || 'task',
          attributes: childAttributes,
        });

        return {
          setData: (key: string, value: unknown) => {
            if (
              span &&
              (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
            ) {
              span.setAttribute(key, value);
            }
          },
          finish: () => {
            span?.end();
          },
        };
      },

      setData: (key: string, value: unknown) => {
        if (
          activeSpan &&
          (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')
        ) {
          activeSpan.setAttribute(key, value);
        }
      },

      setTag: (key: string, value: string) => {
        activeSpan?.setAttribute(key, value);
      },

      finish: () => {
        activeSpan?.end();
      },

      fail: (error?: Error) => {
        if (error) {
          this.captureError(error, {
            tags: {
              transaction: transaction.name,
              ...transaction.tags,
            },
          });
        }
        activeSpan?.end();
      },
    };
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
