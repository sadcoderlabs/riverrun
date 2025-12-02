/**
 * usePushNotifications - React Hook for Push Notification Setup
 *
 * This hook configures the notification handler for the app.
 * Device registration is now handled by useNotificationStatus in the settings page.
 *
 * Call this hook in your root layout to configure notification handling.
 */

import * as Notifications from 'expo-notifications';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook for configuring push notification handling.
 *
 * Call this hook in your root layout to enable push notifications.
 * Device registration/unregistration is handled by useNotificationStatus.
 *
 * @example
 * ```tsx
 * // In _layout.tsx
 * import { usePushNotifications } from '@/app-internal/features/notification';
 *
 * export default function RootLayout() {
 *   usePushNotifications();
 *   // ...
 * }
 * ```
 */
export function usePushNotifications(): void {
  // Notification handler is configured at module level.
  // This hook is kept for backwards compatibility and future extensibility.
}
