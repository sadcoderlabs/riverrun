/**
 * Alert-based Builder Fee Approval Confirmation Adapter
 *
 * Implements BuilderFeeApprovalConfirmationPort using React Native Alert dialogs.
 * This is a presentation layer implementation that handles UI-specific details.
 *
 * Design Pattern: Adapter (Hexagonal Architecture)
 * - Adapts domain port to specific UI implementation (React Native Alert)
 * - Handles wallet-specific messaging (Reown vs Privy)
 * - Provides clear fee information to users
 */

import { Alert } from 'react-native';
import type { WalletPort } from '../../wallet/ports/walletPort';
import type { BuilderFeeConfirmationPort } from '../application/ports/BuilderFeeConfirmationPort';
import { BUILDER_CONFIG } from '../config';

export class AlertBuilderFeeApprovalConfirmationAdapter implements BuilderFeeConfirmationPort {
  constructor(private readonly walletService: WalletPort) {}

  async confirmApproval(): Promise<boolean> {
    // Get wallet type to show appropriate message
    const wallet = await this.walletService.active();
    const isReown = wallet?.source === 'reown';

    // Calculate fee percentage from rate (25 units = 0.025%)
    // Formula: rate * 0.001% = percentage
    const feePercentage = (BUILDER_CONFIG.feeRate * 0.001).toFixed(3);

    const title = 'Builder Fee Approval Required';
    const message = isReown
      ? `This app collects a ${feePercentage}% builder fee on trades to support development. You will be redirected to your mobile wallet app to sign the approval transaction. Do you want to proceed?`
      : `This app collects a ${feePercentage}% builder fee on trades to support development. You will sign a transaction to approve the maximum fee (${BUILDER_CONFIG.maxFeeRate}). Do you want to proceed?`;

    return new Promise<boolean>(resolve => {
      Alert.alert(title, message, [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: 'Approve',
          onPress: () => resolve(true),
        },
      ]);
    });
  }
}
