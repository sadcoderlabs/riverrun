/**
 * usePushNotifications - React Hook for Push Notification Registration
 *
 * This hook handles:
 * - Requesting notification permissions
 * - Getting Expo push token
 * - Auto-registering device when wallet connects
 *
 * Registration happens automatically on wallet connect with silent failure.
 */

import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';

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
  const telemetryService = useContainer(c => c.telemetryService);
  const { wallet, getSigner, isConnected } = useWallet();

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

    // Get push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  }, []);

  /**
   * Register device with backend
   */
  const registerDevice = useCallback(async () => {
    if (!isConnected || !wallet) {
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

      const signer = await getSigner();
      const platform = Platform.OS as 'ios' | 'android';

      await registerDeviceUseCase.execute({
        signer,
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
  }, [isConnected, wallet, getSigner, getExpoPushToken, registerDeviceUseCase, telemetryService]);

  // Auto-register when wallet connects
  useEffect(() => {
    if (isConnected && wallet) {
      registerDevice();
    }
  }, [isConnected, wallet, registerDevice]);

  // Reset registration state when wallet disconnects
  useEffect(() => {
    if (!isConnected) {
      registeredWalletRef.current = undefined;
    }
  }, [isConnected]);
}
