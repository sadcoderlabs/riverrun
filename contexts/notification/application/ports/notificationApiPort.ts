/**
 * NotificationApiPort - Port interface for notification backend API
 *
 * This port defines the contract for registering/unregistering devices
 * with the push notification backend service.
 */

export interface RegisterDeviceParams {
  signature: `0x${string}`;
  message: string;
  deviceToken: string;
  platform: 'ios' | 'android';
}

export interface NotificationApiPort {
  /**
   * Register a device for push notifications
   *
   * @param params - Device registration parameters including signed message
   * @returns Success response from backend
   */
  registerDevice(params: RegisterDeviceParams): Promise<{ success: boolean }>;
}
