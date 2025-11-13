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
   * Start a performance transaction
   */
  startTransaction(transaction: PerformanceTransaction): TransactionHandle | undefined {
    const sentryTransaction = Sentry.startTransaction({
      name: transaction.name,
      op: transaction.operation || 'task',
      data: transaction.data,
      tags: transaction.tags,
    });

    if (!sentryTransaction) {
      return undefined;
    }

    return {
      startChild: (span: PerformanceSpan): SpanHandle => {
        const sentrySpan = sentryTransaction.startChild({
          op: span.operation || 'task',
          description: span.name,
          data: span.data,
        });

        return {
          setData: (key: string, value: unknown) => {
            sentrySpan.setData(key, value);
          },
          finish: () => {
            sentrySpan.finish();
          },
        };
      },

      setData: (key: string, value: unknown) => {
        sentryTransaction.setData(key, value);
      },

      setTag: (key: string, value: string) => {
        sentryTransaction.setTag(key, value);
      },

      finish: () => {
        sentryTransaction.setStatus('ok');
        sentryTransaction.finish();
      },

      fail: (error?: Error) => {
        sentryTransaction.setStatus('unknown_error');
        if (error) {
          this.captureError(error);
        }
        sentryTransaction.finish();
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
