import type { TryGetAgentResult } from './types';

/**
 * Agent Port Interface
 * Defines the contract for core agent business operations
 *
 * This interface contains only 3 essential methods:
 * 1. tryGetAgentWallet - Get or create agent wallet (for trading)
 * 2. loadAllAgents - Load all agents from blockchain (for initialization)
 * 3. revoke - Revoke an agent (for management)
 */
export interface AgentPort {
  /**
   * Try to get agent wallet for trading
   *
   * This method:
   * 1. Gets existing agent from storage
   * 2. Validates against allAgents (loaded optimistically)
   * 3. If valid, returns the agent wallet
   * 4. If invalid or missing, creates new agent and approves it
   * 5. If user cancels approval, returns error reason
   *
   * @returns Promise resolving to result containing agentWallet or error reason
   */
  tryGetAgentWallet(): Promise<TryGetAgentResult>;

  /**
   * Load all agents from blockchain
   *
   * This method:
   * 1. Fetches all agents from blockchain (via extraAgents API)
   * 2. Gets or creates agent wallet from storage
   * 3. Updates agentStateStore with agentAddress and allAgents
   *
   * Used for: app initialization, wallet switch, manual refresh
   */
  loadAllAgents(): Promise<void>;

  /**
   * Revoke a named agent from blockchain
   *
   * This method:
   * 1. Revokes agent on blockchain
   * 2. If Riverrun Agent, clears local storage
   * 3. Updates agentStateStore
   *
   * @param agentName - Name of the agent to revoke
   * @returns Promise resolving to true if successful
   */
  revoke(agentName: string): Promise<boolean>;
}
