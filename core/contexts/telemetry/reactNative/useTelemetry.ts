/**
 * useTelemetry Hook
 *
 * Public hook for accessing telemetry business operations.
 * Provides methods for error tracking and breadcrumbs.
 */

import { useCallback } from 'react';

import { useTelemetryComposition } from './telemetryComposition';
import type {
  BreadcrumbData,
  ErrorContext,
  TelemetrySeverity,
  TelemetryUser,
} from '../ports/types';

export interface UseTelemetryResult {
  /**
   * Identify the current user
   * @param userId Unique user identifier (e.g., wallet address)
   * @param user Optional user traits and metadata
   */
  identifyUser: (userId: string, user?: Partial<TelemetryUser>) => Promise<void>;

  /**
   * Clear user identification
   * Call this when user disconnects/logs out
   */
  clearUser: () => Promise<void>;

  /**
   * Capture an error with optional context
   * @param error Error object or message
   * @param context Additional context about the error
   */
  captureError: (error: Error | string, context?: ErrorContext) => Promise<void>;

  /**
   * Capture a message with severity level
   * @param message Message to log
   * @param level Severity level (default: 'info')
   * @param context Additional context
   */
  captureMessage: (
    message: string,
    level?: TelemetrySeverity,
    context?: ErrorContext,
  ) => Promise<void>;

  /**
   * Add a breadcrumb to track user actions
   * Breadcrumbs provide context leading up to errors
   * @param breadcrumb Breadcrumb data
   */
  addBreadcrumb: (breadcrumb: BreadcrumbData) => void;

  /**
   * Set a global context value
   * @param key Context key
   * @param value Context value
   */
  setContext: (key: string, value: Record<string, unknown>) => void;

  /**
   * Set a global tag
   * @param key Tag key
   * @param value Tag value
   */
  setTag: (key: string, value: string) => void;

  /**
   * Enable or disable telemetry
   * @param enabled Whether telemetry should be enabled
   */
  setEnabled: (enabled: boolean) => Promise<void>;

  /**
   * Check if telemetry is currently enabled
   */
  isEnabled: () => boolean;
}

/**
 * useTelemetry - Telemetry business operations hook
 *
 * This hook provides telemetry operations for error tracking and breadcrumbs.
 * All operations are fire-and-forget and don't require loading states.
 *
 * For state access (userId, isEnabled), use useTelemetryStore instead.
 *
 * @example
 * ```tsx
 * import { useTelemetry } from '@/core/composition';
 *
 * function MyComponent() {
 *   const { captureError, addBreadcrumb } = useTelemetry();
 *
 *   const handleSubmit = async () => {
 *     // Add breadcrumb for user action
 *     addBreadcrumb({
 *       category: 'user',
 *       message: 'User clicked submit button',
 *       level: 'info',
 *     });
 *
 *     try {
 *       await submitForm();
 *     } catch (error) {
 *       captureError(error, {
 *         component: 'MyComponent',
 *         action: 'submit_form',
 *       });
 *     }
 *   };
 *
 *   return <Button onPress={handleSubmit}>Submit</Button>;
 * }
 * ```
 */
export function useTelemetry(): UseTelemetryResult {
  const { telemetryService } = useTelemetryComposition();

  // All methods are wrapped in useCallback to ensure stable references
  const identifyUser = useCallback(
    (userId: string, user?: Partial<TelemetryUser>) => {
      return telemetryService.identifyUser(userId, user);
    },
    [telemetryService],
  );

  const clearUser = useCallback(() => {
    return telemetryService.clearUser();
  }, [telemetryService]);

  const captureError = useCallback(
    (error: Error | string, context?: ErrorContext) => {
      return telemetryService.captureError(error, context);
    },
    [telemetryService],
  );

  const captureMessage = useCallback(
    (message: string, level?: TelemetrySeverity, context?: ErrorContext) => {
      return telemetryService.captureMessage(message, level, context);
    },
    [telemetryService],
  );

  const addBreadcrumb = useCallback(
    (breadcrumb: BreadcrumbData) => {
      telemetryService.addBreadcrumb(breadcrumb);
    },
    [telemetryService],
  );

  const setContext = useCallback(
    (key: string, value: Record<string, unknown>) => {
      telemetryService.setContext(key, value);
    },
    [telemetryService],
  );

  const setTag = useCallback(
    (key: string, value: string) => {
      telemetryService.setTag(key, value);
    },
    [telemetryService],
  );

  const setEnabled = useCallback(
    (enabled: boolean) => {
      return telemetryService.setEnabled(enabled);
    },
    [telemetryService],
  );

  const isEnabled = useCallback(() => {
    return telemetryService.isEnabled();
  }, [telemetryService]);

  return {
    identifyUser,
    clearUser,
    captureError,
    captureMessage,
    addBreadcrumb,
    setContext,
    setTag,
    setEnabled,
    isEnabled,
  };
}
