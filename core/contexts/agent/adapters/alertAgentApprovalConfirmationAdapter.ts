/**
 * Alert-based Agent Approval Confirmation Adapter
 *
 * Implements AgentApprovalConfirmationPort using React Native Alert dialogs.
 * This is a presentation layer implementation that handles UI-specific details.
 */

import { Alert } from 'react-native';
import type { WalletPort } from '../../wallet/ports/walletPort';
import type { AgentApprovalConfirmationPort } from '../ports/agentApprovalConfirmationPort';

export class AlertAgentApprovalConfirmationAdapter implements AgentApprovalConfirmationPort {
  constructor(private readonly walletService: WalletPort) {}

  async confirmApproval(): Promise<boolean> {
    // Get wallet type to show appropriate message
    const wallet = await this.walletService.active();
    const isReown = wallet?.source === 'reown';

    const title = 'Agent Approval Required';
    const message = isReown
      ? 'We need to create an agent wallet to execute trades on your behalf. You will be redirected to your mobile wallet app to sign the approval transaction. Do you want to proceed?'
      : 'We need to create an agent wallet to execute trades on your behalf. You will sign a transaction to approve this agent. Do you want to proceed?';

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
