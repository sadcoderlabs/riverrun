/**
 * useNotificationStatus - Hook for two-layer notification status management
 *
 * Manages both layers of notification permissions:
 * - Layer 1: Device system permission (iOS/Android)
 * - Layer 2: Backend notification status (fetched from API)
 *
 * Backend status is fetched from the API, not stored locally.
 */

import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useState } from 'react';
import { Linking, Platform } from 'react-native';

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';

const PROJECT_ID = Constants.easConfig?.projectId;

export type SystemPermissionStatus = 'granted' | 'denied' | 'undetermined';

export interface UseNotificationStatusResult {
  /** Device system permission status */
  systemPermission: SystemPermissionStatus;
  /** Whether notifications are enabled on backend */
  backendEnabled: boolean;
  /** Whether an operation is in progress */
  isLoading: boolean;
  /** Whether initial data has been loaded */
  isReady: boolean;
  /** Toggle backend notification status */
  toggleBackendEnabled: () => Promise<void>;
  /** Open device system settings */
  openSystemSettings: () => void;
  /** Request system permission (iOS only) */
  requestSystemPermission: () => Promise<boolean>;
  /** Refresh all status */
  refetch: () => Promise<void>;
}

/**
 * Hook for managing notification status with two-layer permission model.
 *
 * @example
 * ```tsx
 * const {
 *   systemPermission,
 *   backendEnabled,
 *   toggleBackendEnabled,
 *   openSystemSettings,
 * } = useNotificationStatus();
 *
 * // System permission denied - show guide
 * if (systemPermission === 'denied') {
 *   return <PermissionGuide onPress={openSystemSettings} />;
 * }
 *
 * // Toggle backend status
 * <Switch checked={backendEnabled} onCheckedChange={toggleBackendEnabled} />
 * ```
 */
export function useNotificationStatus(): UseNotificationStatusResult {
  const { wallet, isConnected } = useWallet();
  const getNotificationStatusUseCase = useContainer(c => c.getNotificationStatusUseCase);
  const registerDeviceUseCase = useContainer(c => c.registerDeviceUseCase);
  const unregisterDeviceUseCase = useContainer(c => c.unregisterDeviceUseCase);

  const [systemPermission, setSystemPermission] = useState<SystemPermissionStatus>('undetermined');
  const [backendEnabled, setBackendEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  /**
   * Check device system permission status
   */
  const checkSystemPermission = useCallback(async (): Promise<SystemPermissionStatus> => {
    // Android is auto-opted in
    if (Platform.OS === 'android') {
      setSystemPermission('granted');
      return 'granted';
    }

    try {
      const { status } = await Notifications.getPermissionsAsync();
      const mappedStatus: SystemPermissionStatus =
        status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
      setSystemPermission(mappedStatus);
      return mappedStatus;
    } catch (error) {
      console.error('[NotificationStatus] Failed to check system permission:', error);
      setSystemPermission('undetermined');
      return 'undetermined';
    }
  }, []);

  /**
   * Request system permission (iOS only)
   */
  const requestSystemPermission = useCallback(async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      return true;
    }

    try {
      const { status } = await Notifications.requestPermissionsAsync();
      const granted = status === 'granted';
      setSystemPermission(granted ? 'granted' : 'denied');
      return granted;
    } catch (error) {
      console.error('[NotificationStatus] Failed to request permission:', error);
      return false;
    }
  }, []);

  /**
   * Open device system settings
   */
  const openSystemSettings = useCallback(() => {
    Linking.openSettings();
  }, []);

  /**
   * Get device token for push notifications
   */
  const getDeviceToken = useCallback(async (): Promise<string | undefined> => {
    if (!Device.isDevice) {
      console.log('[NotificationStatus] Not a physical device, skipping');
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
      console.error('[NotificationStatus] Failed to get device token:', error);
      return undefined;
    }
  }, []);

  /**
   * Fetch backend notification status
   */
  const fetchBackendStatus = useCallback(async () => {
    if (!isConnected || !wallet) {
      setBackendEnabled(false);
      return;
    }

    try {
      const status = await getNotificationStatusUseCase.execute({
        walletAddress: wallet.address,
      });
      setBackendEnabled(status.enabled);
    } catch (error) {
      console.error('[NotificationStatus] Failed to fetch backend status:', error);
      setBackendEnabled(false);
    }
  }, [isConnected, wallet, getNotificationStatusUseCase]);

  /**
   * Refresh all status (system permission + backend status)
   */
  const refetch = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([checkSystemPermission(), fetchBackendStatus()]);
    } finally {
      setIsLoading(false);
    }
  }, [checkSystemPermission, fetchBackendStatus]);

  /**
   * Toggle backend notification status
   */
  const toggleBackendEnabled = useCallback(async () => {
    if (!wallet) return;

    setIsLoading(true);
    try {
      const deviceToken = await getDeviceToken();
      if (!deviceToken) {
        console.error('[NotificationStatus] Failed to get device token');
        return;
      }

      if (backendEnabled) {
        // Unregister device
        await unregisterDeviceUseCase.execute({
          walletAddress: wallet.address,
          deviceToken,
        });
        setBackendEnabled(false);
        console.log('[NotificationStatus] Device unregistered');
      } else {
        // Register device
        await registerDeviceUseCase.execute({
          walletAddress: wallet.address,
          deviceToken,
          platform: Platform.OS as 'ios' | 'android',
        });
        setBackendEnabled(true);
        console.log('[NotificationStatus] Device registered');
      }
    } catch (error) {
      console.error('[NotificationStatus] Toggle failed:', error);
      // Refetch to get accurate state
      await fetchBackendStatus();
    } finally {
      setIsLoading(false);
    }
  }, [
    wallet,
    backendEnabled,
    getDeviceToken,
    registerDeviceUseCase,
    unregisterDeviceUseCase,
    fetchBackendStatus,
  ]);

  // Initial load
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      await checkSystemPermission();
      await fetchBackendStatus();
      setIsLoading(false);
      setIsReady(true);
    };
    void init();
  }, [checkSystemPermission, fetchBackendStatus]);

  // Refetch when wallet changes
  useEffect(() => {
    if (isReady) {
      void fetchBackendStatus();
    }
  }, [wallet?.address, isReady, fetchBackendStatus]);

  return {
    systemPermission,
    backendEnabled,
    isLoading,
    isReady,
    toggleBackendEnabled,
    openSystemSettings,
    requestSystemPermission,
    refetch,
  };
}
