/**
 * useNotificationSetup - Hook for notification permission setup flow
 *
 * Handles platform-specific notification permission logic:
 * - Android: Auto-opted in, no action needed
 * - iOS: Request permission if not prompted, or open settings if already prompted
 *
 * Designed to be used in welcome screens. For full notification management
 * including backend registration, use useNotificationStatus instead.
 */

import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export interface UseNotificationSetupResult {
  /** Current permission status */
  permissionStatus: NotificationPermissionStatus;
  /** Whether the hook is ready (permissions checked) */
  isReady: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /**
   * Request notification permission or open settings.
   * - Android: Always returns true (auto-opted in)
   * - iOS undetermined: Shows permission dialog
   * - iOS denied: Opens app settings
   * Returns true if permission was granted or user was directed to settings.
   */
  requestOrOpenSettings: () => Promise<boolean>;
  /** Enable notifications (requests system permission) */
  enableNotifications: () => Promise<boolean>;
  /** Refresh permission status */
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for managing notification setup flow.
 *
 * @example
 * ```tsx
 * const { permissionStatus, requestOrOpenSettings, isLoading } = useNotificationSetup();
 *
 * // In welcome screen OK handler
 * const handleOk = async () => {
 *   await requestOrOpenSettings();
 * };
 * ```
 */
export function useNotificationSetup(): UseNotificationSetupResult {
  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Check current permission status
   */
  const refreshStatus = useCallback(async () => {
    if (Platform.OS === 'android') {
      // Android is auto-opted in
      setPermissionStatus('granted');
      setIsReady(true);
      return;
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      if (status === 'granted') {
        setPermissionStatus('granted');
      } else if (status === 'denied') {
        setPermissionStatus('denied');
      } else {
        setPermissionStatus('undetermined');
      }
    } catch (error) {
      console.error('[NotificationSetup] Failed to get permission status:', error);
      setPermissionStatus('undetermined');
    } finally {
      setIsReady(true);
    }
  }, []);

  // Check permission status on mount
  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  /**
   * Request permission or open settings based on current status
   */
  const requestOrOpenSettings = useCallback(async (): Promise<boolean> => {
    // Android: auto-opted in, just return success
    if (Platform.OS === 'android') {
      return true;
    }

    setIsLoading(true);

    try {
      // Check current status
      const { status: currentStatus } = await Notifications.getPermissionsAsync();

      if (currentStatus === 'granted') {
        setPermissionStatus('granted');
        return true;
      }

      if (currentStatus === 'undetermined') {
        // First time - show permission dialog
        const { status: newStatus } = await Notifications.requestPermissionsAsync();
        if (newStatus === 'granted') {
          setPermissionStatus('granted');
          return true;
        } else {
          setPermissionStatus('denied');
          return false;
        }
      }

      // Already denied - open app settings
      Alert.alert(
        'Notifications Disabled',
        'To enable notifications, please go to Settings and allow notifications for this app.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Open Settings',
            onPress: () => {
              Linking.openSettings();
            },
          },
        ],
      );
      return true; // User was directed to settings
    } catch (error) {
      console.error('[NotificationSetup] Failed to request permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Enable notifications (requests system permission)
   * Note: Backend registration is handled separately by useNotificationStatus
   */
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      // Request system permission
      const permissionGranted = await requestOrOpenSettings();
      return permissionGranted;
    } finally {
      setIsLoading(false);
    }
  }, [requestOrOpenSettings]);

  return {
    permissionStatus,
    isReady,
    isLoading,
    requestOrOpenSettings,
    enableNotifications,
    refreshStatus,
  };
}
