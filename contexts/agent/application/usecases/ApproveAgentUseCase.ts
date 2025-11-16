/**
 * ApproveAgentUseCase
 *
 * Single Responsibility: Approve an agent on blockchain (with user confirmation)
 */

import type { AgentExchangePort } from '../ports/AgentExchangePort';
import type { AgentApprovalConfirmationPort } from '../../ports/agentApprovalConfirmationPort';
import type { ApproveAgentCommand } from '../../ports/types';

/**
 * UseCase for approving an agent
 */
export class ApproveAgentUseCase {
  constructor(
    private readonly exchange: AgentExchangePort,
    private readonly confirmation: AgentApprovalConfirmationPort,
  ) {}

  /**
   * Execute: Approve agent (with user confirmation)
   * @param command - Command with signer, agentAddress, and agentName
   * @returns True if approved successfully, false if user cancelled
   */
  async execute(command: ApproveAgentCommand): Promise<boolean> {
    const { signer, agentAddress, agentName } = command;

    try {
      // Request user confirmation
      const confirmed = await this.confirmation.confirmApproval();

      if (!confirmed) {
        // User cancelled
        return false;
      }

      // User confirmed - execute approval transaction
      await this.exchange.approveAgent(signer, agentAddress, agentName);

      return true;
    } catch (error) {
      console.error('[ApproveAgentUseCase] Failed to approve agent:', error);
      throw error;
    }
  }
}
