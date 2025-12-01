/**
 * useNotificationSetup - Hook for notification permission setup flow
 *
 * Handles platform-specific notification permission logic:
 * - Android: Auto-opted in, no action needed
 * - iOS: Request permission if not prompted, or open settings if already prompted
 *
 * Designed to be used in welcome screens. Includes:
 * - System permission handling
 * - Backend device registration
 * - AppState listener for detecting return from system settings
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, type AppStateStatus, Linking, Platform } from 'react-native';
import { toast } from 'sonner-native';

import { useContainer } from '@/app-internal/di';

const PROJECT_ID = Constants.easConfig?.projectId;

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
  /** Whether waiting for user to return from system settings */
  isWaitingForSettings: boolean;
  /** Whether both system permission and backend registration are complete */
  setupComplete: boolean;
  /**
   * Complete notification setup with backend registration.
   * - Requests system permission
   * - If granted, registers device with backend
   * - If user is sent to settings, waits for return and auto-completes
   * @returns true if setup completed immediately, false if waiting for settings
   */
  setupNotificationsWithBackend: (
    walletAddress: string,
    platform: 'ios' | 'android',
  ) => Promise<boolean>;
}

/**
 * Hook for managing notification setup flow.
 *
 * @example
 * ```tsx
 * const { setupNotificationsWithBackend, setupComplete, isLoading } = useNotificationSetup();
 *
 * // In welcome screen OK handler
 * const handleOk = async () => {
 *   const success = await setupNotificationsWithBackend(walletAddress, Platform.OS);
 *   if (success) {
 *     goToNextPage();
 *   }
 *   // If !success, wait for setupComplete to trigger navigation
 * };
 *
 * // Watch for setupComplete (when returning from settings)
 * useEffect(() => {
 *   if (setupComplete) {
 *     goToNextPage();
 *   }
 * }, [setupComplete, goToNextPage]);
 * ```
 */
export function useNotificationSetup(): UseNotificationSetupResult {
  const registerDeviceUseCase = useContainer(c => c.registerDeviceUseCase);

  const [permissionStatus, setPermissionStatus] =
    useState<NotificationPermissionStatus>('undetermined');
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWaitingForSettings, setIsWaitingForSettings] = useState(false);
  const [setupComplete, setSetupComplete] = useState(false);

  // Store wallet address and platform for use when returning from settings
  const pendingRegistrationRef = useRef<
    | {
        walletAddress: string;
        platform: 'ios' | 'android';
      }
    | undefined
  >(undefined);

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

  /**
   * Get device token for push notifications
   */
  const getDeviceToken = useCallback(async (): Promise<string | undefined> => {
    if (!Device.isDevice) {
      console.log('[NotificationSetup] Not a physical device, skipping token');
      return undefined;
    }

    // Android requires notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({ projectId: PROJECT_ID });
      return tokenData.data;
    } catch (error) {
      console.error('[NotificationSetup] Failed to get device token:', error);
      return undefined;
    }
  }, []);

  /**
   * Register device with backend
   */
  const registerDevice = useCallback(
    async (walletAddress: string, platform: 'ios' | 'android'): Promise<boolean> => {
      try {
        const deviceToken = await getDeviceToken();
        if (!deviceToken) {
          console.error('[NotificationSetup] No device token available');
          return false;
        }

        await registerDeviceUseCase.execute({
          walletAddress,
          deviceToken,
          platform,
        });

        console.log('[NotificationSetup] Device registered successfully');
        return true;
      } catch (error) {
        console.error('[NotificationSetup] Failed to register device:', error);
        toast.error('Notification Setup Failed', {
          description: 'Failed to enable notifications. You can enable them later in Settings.',
        });
        return false;
      }
    },
    [getDeviceToken, registerDeviceUseCase],
  );

  /**
   * Complete notification setup with backend registration.
   * Returns true if setup completed immediately, false if user was sent to settings.
   */
  const setupNotificationsWithBackend = useCallback(
    async (walletAddress: string, platform: 'ios' | 'android'): Promise<boolean> => {
      setIsLoading(true);
      setSetupComplete(false);

      try {
        // Android: auto-granted, just register
        if (Platform.OS === 'android') {
          await registerDevice(walletAddress, platform);
          setSetupComplete(true);
          return true;
        }

        // iOS: check current permission status
        const { status: currentStatus } = await Notifications.getPermissionsAsync();

        if (currentStatus === 'granted') {
          // Already granted, register device
          await registerDevice(walletAddress, platform);
          setSetupComplete(true);
          return true;
        }

        if (currentStatus === 'undetermined') {
          // First time - show permission dialog
          const { status: newStatus } = await Notifications.requestPermissionsAsync();

          if (newStatus === 'granted') {
            setPermissionStatus('granted');
            await registerDevice(walletAddress, platform);
            setSetupComplete(true);
            return true;
          } else {
            setPermissionStatus('denied');
            // User denied, but we still complete (they can enable later)
            setSetupComplete(true);
            return true;
          }
        }

        // Already denied - need to go to settings
        // Store registration params for when user returns
        pendingRegistrationRef.current = { walletAddress, platform };
        setIsWaitingForSettings(true);

        Alert.alert(
          'Notifications Disabled',
          'To enable notifications, please go to Settings and allow notifications for this app.',
          [
            {
              text: 'Cancel',
              style: 'cancel',
              onPress: () => {
                // User cancelled, complete anyway
                setIsWaitingForSettings(false);
                pendingRegistrationRef.current = undefined;
                setSetupComplete(true);
              },
            },
            {
              text: 'Open Settings',
              onPress: () => {
                Linking.openSettings();
              },
            },
          ],
        );

        return false; // Waiting for user to return from settings
      } finally {
        setIsLoading(false);
      }
    },
    [registerDevice],
  );

  /**
   * AppState listener - detect when user returns from settings
   */
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (!isWaitingForSettings) return;
      if (nextAppState !== 'active') return;

      console.log('[NotificationSetup] App became active, checking permission...');

      // Check if permission was granted in settings
      const { status } = await Notifications.getPermissionsAsync();

      if (status === 'granted') {
        setPermissionStatus('granted');

        // Register device if we have pending registration
        if (pendingRegistrationRef.current) {
          const { walletAddress, platform } = pendingRegistrationRef.current;
          await registerDevice(walletAddress, platform);
        }
      }

      // Cleanup and mark complete
      setIsWaitingForSettings(false);
      pendingRegistrationRef.current = undefined;
      setSetupComplete(true);
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isWaitingForSettings, registerDevice]);

  return {
    permissionStatus,
    isReady,
    isLoading,
    requestOrOpenSettings,
    enableNotifications,
    refreshStatus,
    isWaitingForSettings,
    setupComplete,
    setupNotificationsWithBackend,
  };
}
