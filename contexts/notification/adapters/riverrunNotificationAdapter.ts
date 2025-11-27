/**
 * RiverrunNotificationAdapter - HTTP adapter for notification backend API
 *
 * Implements NotificationApiPort to communicate with the riverrun-backend
 * notification service endpoints.
 */

import Constants from 'expo-constants';
import type {
  NotificationApiPort,
  RegisterDeviceParams,
} from '../application/ports/notificationApiPort';

export class RiverrunNotificationAdapter implements NotificationApiPort {
  private baseUrl: string;

  constructor() {
    const url = Constants.expoConfig?.extra?.backendApiBaseUrl;
    if (!url) {
      throw new Error('[RiverrunNotificationAdapter] BACKEND_API_BASE_URL not configured');
    }
    this.baseUrl = url;
  }

  async registerDevice(params: RegisterDeviceParams): Promise<{ success: boolean }> {
    const response = await fetch(`${this.baseUrl}/devices/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        signature: params.signature,
        message: params.message,
        deviceToken: params.deviceToken,
        platform: params.platform,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(`Device registration failed: ${error.error || response.statusText}`);
    }

    return response.json();
  }
}
