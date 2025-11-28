/**
 * UnregisterDeviceUseCase - Unregister a device from push notifications
 *
 * This use case handles the process of calling the backend API
 * to unregister a device using a wallet ownership proof.
 */

import type { WalletProof } from '@/contexts/wallet/adapters/walletProofStore';
import type { NotificationApiPort } from '../ports/notificationApiPort';

export interface UnregisterDeviceInput {
  proof: WalletProof;
  deviceToken: string;
}

export interface UnregisterDeviceOutput {
  success: boolean;
}

export class UnregisterDeviceUseCase {
  constructor(private notificationApiPort: NotificationApiPort) {}

  async execute(input: UnregisterDeviceInput): Promise<UnregisterDeviceOutput> {
    const { proof, deviceToken } = input;

    const result = await this.notificationApiPort.unregisterDevice({
      signature: proof.signature,
      message: proof.message,
      deviceToken,
    });

    return { success: result.success };
  }
}
