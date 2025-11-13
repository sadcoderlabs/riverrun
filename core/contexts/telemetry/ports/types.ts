/**
 * Telemetry Domain Types
 *
 * Defines the domain types for telemetry operations including
 * error tracking, breadcrumbs, and user identification.
 */

/**
 * Severity levels for telemetry events
 */
export type TelemetrySeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

/**
 * Breadcrumb categories for tracking user actions
 */
export type BreadcrumbCategory =
  | 'navigation'
  | 'user'
  | 'network'
  | 'state'
  | 'transaction'
  | 'system'
  | 'console';

/**
 * Breadcrumb data structure
 */
export interface BreadcrumbData {
  /**
   * Category of the breadcrumb (e.g., 'navigation', 'user', 'network')
   */
  category?: BreadcrumbCategory;

  /**
   * Descriptive message of the breadcrumb
   */
  message: string;

  /**
   * Severity level
   */
  level?: TelemetrySeverity;

  /**
   * Additional structured data
   */
  data?: Record<string, unknown>;

  /**
   * Timestamp (defaults to now if not provided)
   */
  timestamp?: number;
}

/**
 * User identification and traits
 */
export interface TelemetryUser {
  /**
   * Unique identifier for the user (e.g., wallet address)
   */
  id: string;

  /**
   * Optional user email
   */
  email?: string;

  /**
   * Optional username
   */
  username?: string;

  /**
   * Additional user traits/attributes
   */
  traits?: Record<string, unknown>;
}

/**
 * Context data attached to errors
 */
export interface ErrorContext {
  /**
   * Component or module where the error occurred
   */
  component?: string;

  /**
   * Action being performed when the error occurred
   */
  action?: string;

  /**
   * Additional contextual data
   */
  data?: Record<string, unknown>;

  /**
   * Tags for categorization
   */
  tags?: Record<string, string>;
}

/**
 * Telemetry state stored in the store
 */
export interface TelemetryState {
  /**
   * Current user ID (usually wallet address)
   */
  userId: string | undefined;

  /**
   * Whether telemetry has been initialized
   */
  isInitialized: boolean;

  /**
   * Whether telemetry is enabled
   */
  isEnabled: boolean;

  /**
   * Set the user ID
   */
  setUserId: (userId: string | undefined) => void;

  /**
   * Set initialization status
   */
  setInitialized: (initialized: boolean) => void;

  /**
   * Set enabled status
   */
  setEnabled: (enabled: boolean) => void;
}
