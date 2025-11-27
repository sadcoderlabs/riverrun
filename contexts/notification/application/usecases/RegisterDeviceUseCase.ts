/**
 * RegisterDeviceUseCase - Register a device for push notifications
 *
 * This use case handles the process of calling the backend API
 * to register a device with a pre-signed wallet ownership proof.
 */

import type { WalletProof } from '@/contexts/wallet/adapters/walletProofStore';
import type { NotificationApiPort } from '../ports/notificationApiPort';

export interface RegisterDeviceInput {
  proof: WalletProof;
  deviceToken: string;
  platform: 'ios' | 'android';
}

export interface RegisterDeviceOutput {
  success: boolean;
}

export class RegisterDeviceUseCase {
  constructor(private notificationApiPort: NotificationApiPort) {}

  async execute(input: RegisterDeviceInput): Promise<RegisterDeviceOutput> {
    const { proof, deviceToken, platform } = input;

    // Call the backend API with pre-signed proof
    const result = await this.notificationApiPort.registerDevice({
      signature: proof.signature,
      message: proof.message,
      deviceToken,
      platform,
    });

    return { success: result.success };
  }
}
