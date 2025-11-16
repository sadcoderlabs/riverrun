/**
 * AgentExchangePort - Out Port for blockchain interactions
 *
 * This port defines the interface for agent-related blockchain operations.
 * Implementation: HyperliquidGateway
 */

import type { Signer, BaseWallet } from 'ethers';
import type * as hl from '@nktkas/hyperliquid';

import type { AgentInfo } from '../../ports/types';

/**
 * Port for agent blockchain operations
 */
export interface AgentExchangePort {
  /**
   * Get all agents for a master wallet
   * @param masterAddress - Master wallet address
   * @returns Array of agent info from blockchain
   */
  getAgents(masterAddress: string): Promise<AgentInfo[]>;

  /**
   * Approve an agent on blockchain
   * @param signer - Master wallet signer
   * @param agentAddress - Agent wallet address to approve
   * @param agentName - Name for the agent
   */
  approveAgent(signer: Signer, agentAddress: string, agentName: string): Promise<void>;

  /**
   * Revoke an agent on blockchain
   * @param signer - Master wallet signer
   * @param agentName - Name of the agent to revoke
   */
  revokeAgent(signer: Signer, agentName: string): Promise<void>;

  /**
   * Create exchange client for agent operations
   * @param agentSigner - Agent wallet signer
   * @returns Hyperliquid exchange client
   */
  getAgentExchangeClient(agentSigner: BaseWallet): hl.ExchangeClient;
}
