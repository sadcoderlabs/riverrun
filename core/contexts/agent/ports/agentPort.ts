import type * as hl from '@nktkas/hyperliquid';
import type { AgentApprovalStatus, AgentWallet } from './types';

/**
 * Agent Port Interface
 * Defines the contract for core agent business operations
 *
 * This interface contains only essential business logic.
 * UI helper methods (filtering, counting, etc.) should be implemented
 * in the presentation layer (hooks/components).
 */
export interface AgentPort {
  /**
   * Check approval status for the current agent
   * Also updates allAgents in the store
   * @returns Promise resolving to approval status
   */
  checkApprovalStatus(): Promise<AgentApprovalStatus>;

  /**
   * Approve the Riverrun Agent on blockchain
   * Generates new agent if doesn't exist and approves it
   * @returns Promise resolving to true if successful
   */
  approveAgent(): Promise<boolean>;

  /**
   * Revoke a named agent from blockchain
   * @param agentName - Name of the agent to revoke
   * @returns Promise resolving to true if successful
   */
  revokeAgent(agentName: string): Promise<boolean>;

  /**
   * Get or create agent wallet for the current user
   * @returns Promise resolving to agent wallet
   */
  getOrCreateAgentWallet(): Promise<AgentWallet>;

  /**
   * Get agent exchange client for placing orders
   * @returns Promise resolving to exchange client, or undefined if agent not ready
   */
  getExchangeClient(): Promise<hl.ExchangeClient | undefined>;
}
