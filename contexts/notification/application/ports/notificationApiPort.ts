/**
 * NotificationApiPort - Port interface for notification backend API
 *
 * This port defines the contract for registering/unregistering devices
 * with the push notification backend service.
 */

export interface RegisterDeviceParams {
  walletAddress: string;
  deviceToken: string;
  platform: 'ios' | 'android';
}

export interface UnregisterDeviceParams {
  walletAddress: string;
  deviceToken: string;
}

export interface DeviceInfo {
  deviceToken: string;
  platform: 'ios' | 'android';
  lastActiveAt: number;
  enabled: boolean;
}

export interface NotificationStatusResponse {
  enabled: boolean;
  devices: DeviceInfo[];
}

export interface NotificationApiPort {
  /**
   * Register a device for push notifications
   *
   * @param params - Device registration parameters
   * @returns Success response from backend
   */
  registerDevice(params: RegisterDeviceParams): Promise<{ success: boolean }>;

  /**
   * Unregister a device from push notifications
   *
   * @param params - Device to unregister
   * @returns Success response from backend
   */
  unregisterDevice(params: UnregisterDeviceParams): Promise<{ success: boolean }>;

  /**
   * Get notification status for a wallet
   *
   * @param walletAddress - The wallet address to check status for
   * @returns Notification status including enabled flag and device list
   */
  getNotificationStatus(walletAddress: string): Promise<NotificationStatusResponse>;
}
