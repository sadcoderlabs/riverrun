/**
 * RegisterDeviceUseCase - Register a device for push notifications
 *
 * This use case handles the process of:
 * 1. Creating a signed message to authenticate wallet ownership
 * 2. Calling the backend API to register the device
 */

import type { Signer } from 'ethers';
import type { NotificationApiPort } from '../ports/notificationApiPort';

export interface RegisterDeviceInput {
  signer: Signer;
  deviceToken: string;
  platform: 'ios' | 'android';
}

export interface RegisterDeviceOutput {
  success: boolean;
}

export class RegisterDeviceUseCase {
  constructor(private notificationApiPort: NotificationApiPort) {}

  async execute(input: RegisterDeviceInput): Promise<RegisterDeviceOutput> {
    const { signer, deviceToken, platform } = input;

    // Create message with action and timestamp for replay protection
    const message = JSON.stringify({
      action: 'register_device',
      timestamp: Date.now(),
    });

    // Sign the message using EIP-191 personal sign
    const signature = (await signer.signMessage(message)) as `0x${string}`;

    // Call the backend API
    const result = await this.notificationApiPort.registerDevice({
      signature,
      message,
      deviceToken,
      platform,
    });

    return { success: result.success };
  }
}
