/**
 * Notification Feature Module
 *
 * Exports hooks and utilities for push notification management.
 */

export { useNotificationPreference } from './hooks/useNotificationPreference';
export { useNotificationSetup } from './hooks/useNotificationSetup';
export type {
    NotificationPermissionStatus,
    UseNotificationSetupResult
} from './hooks/useNotificationSetup';
export { usePushNotifications } from './hooks/usePushNotifications';

