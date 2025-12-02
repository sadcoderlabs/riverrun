/**
 * UnregisterDeviceUseCase - Unregister a device from push notifications
 *
 * This use case handles the process of calling the backend API
 * to unregister a device from push notifications.
 */

import type { NotificationApiPort } from '../ports/notificationApiPort';

export interface UnregisterDeviceInput {
  walletAddress: string;
  deviceToken: string;
}

export interface UnregisterDeviceOutput {
  success: boolean;
}

export class UnregisterDeviceUseCase {
  constructor(private notificationApiPort: NotificationApiPort) {}

  async execute(input: UnregisterDeviceInput): Promise<UnregisterDeviceOutput> {
    const { walletAddress, deviceToken } = input;

    const result = await this.notificationApiPort.unregisterDevice({
      walletAddress,
      deviceToken,
    });

    return { success: result.success };
  }
}
