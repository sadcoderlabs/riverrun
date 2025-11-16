/**
 * RevokeAgentUseCase
 *
 * Single Responsibility: Revoke an agent on blockchain and clean up storage if needed
 */

import { DEFAULT_AGENT_NAME } from '../../constants';
import type { AgentExchangePort } from '../ports/AgentExchangePort';
import type { AgentStoragePort } from '../ports/AgentStoragePort';
import type { RevokeAgentCommand } from '../../ports/types';

/**
 * UseCase for revoking an agent
 */
export class RevokeAgentUseCase {
  constructor(
    private readonly exchange: AgentExchangePort,
    private readonly storage: AgentStoragePort,
  ) {}

  /**
   * Execute: Revoke agent on blockchain and clean up storage
   * @param command - Command with signer, agentName, and masterAddress
   * @throws Error if revocation fails or is not confirmed
   */
  async execute(command: RevokeAgentCommand): Promise<void> {
    const { signer, agentName, masterAddress } = command;

    try {
      const isRiverrunAgent = agentName === DEFAULT_AGENT_NAME;

      // 1. Revoke agent on blockchain
      await this.exchange.revokeAgent(signer, agentName);

      // 2. Clear local storage for Riverrun Agent
      if (isRiverrunAgent) {
        await this.storage.clearPrivateKey(masterAddress);
      }

      // 3. Verify revocation
      const agents = await this.exchange.getAgents(masterAddress);
      const stillExists = agents.some(
        agent => agent.name?.toLowerCase() === agentName.toLowerCase(),
      );

      if (stillExists) {
        throw new Error('Agent revocation was not confirmed on blockchain');
      }
    } catch (error) {
      console.error('[RevokeAgentUseCase] Failed to revoke agent:', error);
      throw error;
    }
  }
}
