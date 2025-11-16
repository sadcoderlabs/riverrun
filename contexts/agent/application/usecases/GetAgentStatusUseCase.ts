/**
 * GetAgentStatusUseCase
 *
 * Single Responsibility: Query complete agent status (local + blockchain)
 * Combines:
 * - Get agent address from storage
 * - Get all agents from blockchain
 * - Calculate isApproved status
 */

import type { AgentStoragePort } from '../ports/AgentStoragePort';
import type { AgentExchangePort } from '../ports/AgentExchangePort';
import type { GetAgentStatusCommand, GetAgentStatusResult } from '../../ports/types';
import { GetOrCreateAgentWalletUseCase } from './GetOrCreateAgentWalletUseCase';

/**
 * UseCase for querying complete agent status
 */
export class GetAgentStatusUseCase {
  private readonly getOrCreateAgentWallet: GetOrCreateAgentWalletUseCase;

  constructor(
    private readonly storage: AgentStoragePort,
    private readonly exchange: AgentExchangePort,
  ) {
    // Create internal UseCase for getting agent wallet
    this.getOrCreateAgentWallet = new GetOrCreateAgentWalletUseCase(storage);
  }

  /**
   * Execute: Query agent status from storage and blockchain
   * @param command - Command with masterAddress and provider
   * @returns Complete agent status including approval state
   */
  async execute(command: GetAgentStatusCommand): Promise<GetAgentStatusResult> {
    const { masterAddress, provider } = command;

    try {
      // 1. Get or create agent wallet (to populate agentAddress)
      const agentWallet = await this.getOrCreateAgentWallet.execute({
        masterAddress,
        provider,
      });

      // 2. Fetch all agents from blockchain
      const allAgents = await this.exchange.getAgents(masterAddress);

      // 3. Check if current agent is approved
      const isApproved = allAgents.some(
        agent => agent.address.toLowerCase() === agentWallet.address.toLowerCase(),
      );

      return {
        agentAddress: agentWallet.address,
        allAgents,
        isApproved,
      };
    } catch (error) {
      console.error('[GetAgentStatusUseCase] Failed to get agent status:', error);
      // Return empty state on error
      return {
        agentAddress: undefined,
        allAgents: [],
        isApproved: false,
      };
    }
  }
}
