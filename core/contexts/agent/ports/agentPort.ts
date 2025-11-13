import type { TryGetAgentResult } from './types';

/**
 * Agent Port Interface
 * Defines the contract for core agent business operations
 *
 * This interface contains 3 essential methods:
 * 1. tryGetAgentWallet - Get agent wallet (handles approval internally via confirmation port)
 * 2. loadAllAgents - Load all agents from blockchain (for initialization)
 * 3. revoke - Revoke an agent (for management)
 */
export interface AgentPort {
  /**
   * Try to get agent wallet for trading
   *
   * This method handles the complete flow internally:
   * 1. Gets or creates agent wallet from storage
   * 2. Checks if approved in allAgents
   * 3. If not approved, requests user confirmation via injected confirmation port
   * 4. If confirmed, executes approval transaction
   * 5. Returns agent wallet or error reason
   *
   * All caller code paths (order placement, closing positions, TP/SL, etc.)
   * automatically get user confirmation when needed through this single method.
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
