/**
 * Telemetry Port
 *
 * Defines the business interface for telemetry operations.
 * This port abstracts error tracking, performance monitoring, and user analytics.
 */

import type {
  BreadcrumbData,
  ErrorContext,
  PerformanceTransaction,
  TelemetrySeverity,
  TelemetryUser,
  TransactionHandle,
} from './types';

/**
 * Port interface for telemetry operations
 */
export interface TelemetryPort {
  /**
   * Initialize the telemetry system
   * Should be called once at app startup
   */
  initialize(): Promise<void>;

  /**
   * Identify the current user
   * @param userId Unique user identifier (e.g., wallet address)
   * @param user Optional user traits and metadata
   */
  identifyUser(userId: string, user?: Partial<TelemetryUser>): Promise<void>;

  /**
   * Clear user identification
   * Call this when user disconnects/logs out
   */
  clearUser(): Promise<void>;

  /**
   * Capture an error with optional context
   * @param error Error object or message
   * @param context Additional context about the error
   */
  captureError(error: Error | string, context?: ErrorContext): Promise<void>;

  /**
   * Capture a message with severity level
   * @param message Message to log
   * @param level Severity level (default: 'info')
   * @param context Additional context
   */
  captureMessage(message: string, level?: TelemetrySeverity, context?: ErrorContext): Promise<void>;

  /**
   * Add a breadcrumb to track user actions
   * Breadcrumbs provide context leading up to errors
   * @param breadcrumb Breadcrumb data
   */
  addBreadcrumb(breadcrumb: BreadcrumbData): void;

  /**
   * Start a performance transaction
   * @param transaction Transaction configuration
   * @returns Handle to control the transaction lifecycle
   */
  startTransaction(transaction: PerformanceTransaction): TransactionHandle | undefined;

  /**
   * Set a global context value
   * @param key Context key
   * @param value Context value
   */
  setContext(key: string, value: Record<string, unknown>): void;

  /**
   * Set a global tag
   * @param key Tag key
   * @param value Tag value
   */
  setTag(key: string, value: string): void;

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
