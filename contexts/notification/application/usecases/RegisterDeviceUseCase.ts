/**
 * RegisterDeviceUseCase - Register a device for push notifications
 *
 * This use case handles the process of calling the backend API
 * to register a device for push notifications.
 */

import type { NotificationApiPort } from '../ports/notificationApiPort';

export interface RegisterDeviceInput {
  walletAddress: string;
  deviceToken: string;
  platform: 'ios' | 'android';
}

export interface RegisterDeviceOutput {
  success: boolean;
}

export class RegisterDeviceUseCase {
  constructor(private notificationApiPort: NotificationApiPort) {}

  async execute(input: RegisterDeviceInput): Promise<RegisterDeviceOutput> {
    const { walletAddress, deviceToken, platform } = input;

    const result = await this.notificationApiPort.registerDevice({
      walletAddress,
      deviceToken,
      platform,
    });

    return { success: result.success };
  }
}
