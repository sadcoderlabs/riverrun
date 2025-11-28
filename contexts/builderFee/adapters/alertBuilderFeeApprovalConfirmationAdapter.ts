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

export class AlertBuilderFeeApprovalConfirmationAdapter implements BuilderFeeConfirmationPort {
  constructor(private readonly walletService: WalletPort) {}

  async confirmApproval(): Promise<boolean> {
    // Get wallet type to show appropriate message
    const wallet = await this.walletService.active();
    const isReown = wallet?.source === 'reown';

    const title = 'Approve Trading Fee';
    const message = isReown
      ? `All fees are shown upfront in your order preview before you trade - no hidden costs, no surprises.\n\nYou'll be redirected to your wallet app to sign.`
      : `All fees are shown upfront in your order preview before you trade - no hidden costs, no surprises.\n\nSign to approve and start trading.`;

    return new Promise<boolean>(resolve => {
      Alert.alert(title, message, [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: isReown ? 'Continue' : 'Sign & Start Trading',
          onPress: () => resolve(true),
        },
      ]);
    });
  }
}
