/**
 * Breadcrumb Utilities
 *
 * Helper functions for creating breadcrumbs for common scenarios.
 * These utilities provide a consistent format for tracking user actions.
 */

import type { BreadcrumbData } from '../ports/types';

/**
 * Create a navigation breadcrumb
 * @param screenName Name of the screen navigated to
 * @param params Optional navigation params
 */
export function createNavigationBreadcrumb(
  screenName: string,
  params?: Record<string, unknown>,
): BreadcrumbData {
  return {
    category: 'navigation',
    message: `Navigated to ${screenName}`,
    level: 'info',
    data: {
      screen: screenName,
      params,
    },
  };
}

/**
 * Create a user action breadcrumb
 * @param action Action performed (e.g., 'button_click', 'form_submit')
 * @param data Additional data about the action
 */
export function createUserActionBreadcrumb(
  action: string,
  data?: Record<string, unknown>,
): BreadcrumbData {
  return {
    category: 'user',
    message: `User action: ${action}`,
    level: 'info',
    data: {
      action,
      ...data,
    },
  };
}

/**
 * Create a network request breadcrumb
 * @param method HTTP method (GET, POST, etc.)
 * @param url Request URL
 * @param statusCode Response status code (if available)
 */
export function createNetworkBreadcrumb(
  method: string,
  url: string,
  statusCode?: number,
): BreadcrumbData {
  return {
    category: 'network',
    message: `${method} ${url}${statusCode ? ` (${statusCode})` : ''}`,
    level: statusCode && statusCode >= 400 ? 'error' : 'info',
    data: {
      method,
      url,
      statusCode,
    },
  };
}

/**
 * Create a transaction breadcrumb (blockchain operations)
 * @param transactionType Type of transaction (e.g., 'place_order', 'cancel_order', 'transfer')
 * @param data Transaction details
 */
export function createTransactionBreadcrumb(
  transactionType: string,
  data?: Record<string, unknown>,
): BreadcrumbData {
  return {
    category: 'transaction',
    message: `Transaction: ${transactionType}`,
    level: 'info',
    data: {
      transactionType,
      ...data,
    },
  };
}

/**
 * Create a state change breadcrumb
 * @param stateName Name of the state that changed
 * @param oldValue Previous value (optional)
 * @param newValue New value
 */
export function createStateChangeBreadcrumb(
  stateName: string,
  newValue: unknown,
  oldValue?: unknown,
): BreadcrumbData {
  return {
    category: 'state',
    message: `State change: ${stateName}`,
    level: 'debug',
    data: {
      stateName,
      oldValue,
      newValue,
    },
  };
}

/**
 * Create a system event breadcrumb
 * @param event System event name (e.g., 'app_foreground', 'app_background')
 * @param data Additional event data
 */
export function createSystemEventBreadcrumb(
  event: string,
  data?: Record<string, unknown>,
): BreadcrumbData {
  return {
    category: 'system',
    message: `System event: ${event}`,
    level: 'info',
    data: {
      event,
      ...data,
    },
  };
}

/**
 * Create a console breadcrumb (for logging)
 * @param message Log message
 * @param level Log level
 * @param data Additional data
 */
export function createConsoleBreadcrumb(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' = 'info',
  data?: Record<string, unknown>,
): BreadcrumbData {
  return {
    category: 'console',
    message,
    level,
    data,
  };
}
