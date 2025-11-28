/**
 * BackendNotificationApiAdapter - HTTP adapter for notification backend API
 *
 * Implements NotificationApiPort to communicate with the backend
 * notification service endpoints.
 */

import * as deviceClient from '@/infra/backend/client/deviceClient';
import type {
  NotificationApiPort,
  RegisterDeviceParams,
  UnregisterDeviceParams,
} from '../application/ports/notificationApiPort';

export class BackendNotificationApiAdapter implements NotificationApiPort {
  async registerDevice(params: RegisterDeviceParams): Promise<{ success: boolean }> {
    return deviceClient.registerDevice(params);
  }

  async unregisterDevice(params: UnregisterDeviceParams): Promise<{ success: boolean }> {
    return deviceClient.unregisterDevice(params);
  }
}
