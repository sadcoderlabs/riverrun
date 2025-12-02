/**
 * Notification Feature Module
 *
 * Exports hooks and utilities for push notification management.
 */

export { useNotificationSetup } from './hooks/useNotificationSetup';
export type {
  NotificationPermissionStatus,
  UseNotificationSetupResult,
} from './hooks/useNotificationSetup';
export { useNotificationStatus } from './hooks/useNotificationStatus';
export type {
  SystemPermissionStatus,
  UseNotificationStatusResult,
} from './hooks/useNotificationStatus';
export { usePushNotifications } from './hooks/usePushNotifications';
