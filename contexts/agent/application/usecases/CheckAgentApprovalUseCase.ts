/**
 * CheckAgentApprovalUseCase
 *
 * Single Responsibility: Check if a specific agent is approved on blockchain
 */

import type { AgentExchangePort } from '../ports/AgentExchangePort';
import type { CheckAgentApprovalCommand } from '../../ports/types';

/**
 * UseCase for checking agent approval status
 */
export class CheckAgentApprovalUseCase {
  constructor(private readonly exchange: AgentExchangePort) {}

  /**
   * Execute: Check if agent is approved
   * @param command - Command with agentAddress and masterAddress
   * @returns True if agent is approved, false otherwise
   */
  async execute(command: CheckAgentApprovalCommand): Promise<boolean> {
    const { agentAddress, masterAddress } = command;

    try {
      // Fetch all agents from blockchain
      const allAgents = await this.exchange.getAgents(masterAddress);

      // Check if specified agent exists in the list
      const isApproved = allAgents.some(
        agent => agent.address.toLowerCase() === agentAddress.toLowerCase(),
      );

      return isApproved;
    } catch (error) {
      console.error('[CheckAgentApprovalUseCase] Failed to check agent approval:', error);
      return false;
    }
  }
}
