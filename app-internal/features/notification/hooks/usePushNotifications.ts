/**
 * usePushNotifications - React Hook for Push Notification Registration
 *
 * This hook handles:
 * - Requesting notification permissions
 * - Getting Expo push token
 * - Auto-registering device when notifications enabled
 * - Auto-unregistering device when notifications disabled
 *
 * Registration/unregistration happens automatically based on preference state.
 */

import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import { useWalletOwnershipProof } from '@/app-internal/features/wallet/hooks/useWalletOwnershipProof';
import { useNotificationPreferenceStore } from '../stores/notificationPreferenceStore';
import { useWalletProofStore } from '@/contexts/wallet/adapters/walletProofStore';

// Configure notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Hook for managing push notification registration
 *
 * Call this hook in your root layout to enable push notifications.
 * Registration happens automatically when wallet connects.
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
  const registerDeviceUseCase = useContainer(c => c.registerDeviceUseCase);
  const unregisterDeviceUseCase = useContainer(c => c.unregisterDeviceUseCase);
  const telemetryService = useContainer(c => c.telemetryService);
  const { wallet, isConnected } = useWallet();
  const { requestSignature } = useWalletOwnershipProof();
  const { getProof } = useWalletProofStore();
  const isNotificationEnabled = useNotificationPreferenceStore(state => state.isEnabled);

  // Track if we've already registered for this wallet
  const registeredWalletRef = useRef<string | undefined>(undefined);

  /**
   * Get the Expo push token
   */
  const getExpoPushToken = useCallback(async (): Promise<string | undefined> => {
    // Must be a physical device
    if (!Device.isDevice) {
      console.log('[PushNotifications] Not a physical device, skipping registration');
      return undefined;
    }

    // Android 13+ requires a notification channel before requesting permissions
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    // Check/request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PushNotifications] Permission not granted');
      return undefined;
    }

    // Get push token with projectId for EAS compatibility
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: '058a60a5-6caf-492e-8330-d0814b655293',
    });
    console.log('[PushNotifications] Expo push token:', tokenData.data);
    return tokenData.data;
  }, []);

  /**
   * Register device with backend
   */
  const registerDevice = useCallback(async () => {
    if (!isConnected || !wallet) {
      return;
    }

    // Skip if notifications are disabled
    if (!isNotificationEnabled) {
      console.log('[PushNotifications] Notifications disabled, skipping registration');
      return;
    }

    // Skip if already registered for this wallet
    if (registeredWalletRef.current === wallet.address) {
      return;
    }

    try {
      const deviceToken = await getExpoPushToken();
      if (!deviceToken) {
        return;
      }

      const proof = await requestSignature();
      const platform = Platform.OS as 'ios' | 'android';

      await registerDeviceUseCase.execute({
        proof,
        deviceToken,
        platform,
      });

      // Mark as registered for this wallet
      registeredWalletRef.current = wallet.address;

      console.log('[PushNotifications] Device registered successfully');
      telemetryService.trackEvent('push_notification_registered', {
        platform,
      });
    } catch (error) {
      // Silent fail - don't block user
      console.error('[PushNotifications] Registration failed:', error);
      telemetryService.captureError(error, {
        component: 'usePushNotifications',
        action: 'registerDevice',
        extra: { walletAddress: wallet?.address },
      });
    }
  }, [
    isConnected,
    wallet,
    isNotificationEnabled,
    requestSignature,
    getExpoPushToken,
    registerDeviceUseCase,
    telemetryService,
  ]);

  /**
   * Unregister device from backend
   */
  const unregisterDevice = useCallback(async () => {
    if (!wallet) {
      return;
    }

    // Need a proof to unregister - use cached proof only (don't prompt)
    const proof = getProof(wallet.address.toLowerCase());
    if (!proof) {
      return;
    }

    try {
      const tokenData = await Notifications.getExpoPushTokenAsync({
        projectId: '058a60a5-6caf-492e-8330-d0814b655293',
      });

      await unregisterDeviceUseCase.execute({
        proof,
        deviceToken: tokenData.data,
      });

      console.log('[PushNotifications] Device unregistered successfully');
      telemetryService.trackEvent('push_notification_unregistered', {});
    } catch (error) {
      // Silent fail
      console.error('[PushNotifications] Unregistration failed:', error);
    }
  }, [wallet, getProof, unregisterDeviceUseCase, telemetryService]);

  // Register device when notifications are enabled
  useEffect(() => {
    if (isConnected && wallet && isNotificationEnabled) {
      registerDevice();
    }
  }, [isConnected, wallet, isNotificationEnabled, registerDevice]);

  // Unregister device and reset state when notifications are disabled
  useEffect(() => {
    if (!isNotificationEnabled && registeredWalletRef.current) {
      unregisterDevice();
      registeredWalletRef.current = undefined;
    }
  }, [isNotificationEnabled, unregisterDevice]);

  // Reset registration state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      registeredWalletRef.current = undefined;
    }
  }, [isConnected]);
}
