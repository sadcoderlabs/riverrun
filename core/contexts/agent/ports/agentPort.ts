import type { AgentApprovalStatus, AgentInfo, AgentWallet } from './types';

/**
 * Agent Port Interface
 * Defines the contract for agent-related business operations
 */
export interface AgentPort {
  /**
   * Check approval status for the current agent
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
   * Get all agents for the current user from blockchain
   * @returns Promise resolving to array of agent information
   */
  getAllAgents(): Promise<AgentInfo[]>;

  /**
   * Get or create agent wallet for the current user
   * @returns Promise resolving to agent wallet
   */
  getOrCreateAgentWallet(): Promise<AgentWallet>;

  /**
   * Count named agents on blockchain for current user
   * @returns Promise resolving to count of named agents
   */
  countNamedAgents(): Promise<number>;

  /**
   * Check if agent private key exists in local storage
   * @returns Promise resolving to true if exists
   */
  hasAgentInStorage(): Promise<boolean>;

  /**
   * Verify if specific agent address is approved on blockchain
   * @param agentAddress - Agent address to verify
   * @returns Promise resolving to true if approved
   */
  verifyAgentApproval(agentAddress: string): Promise<boolean>;

  /**
   * Find agent by name from all agents
   * @param agentName - Name of the agent to find
   * @returns Promise resolving to agent info or undefined
   */
  findAgentByName(agentName: string): Promise<AgentInfo | undefined>;

  /**
   * Clear agent data from local storage
   * Used when revoking Riverrun Agent
   * @returns Promise resolving when cleared
   */
  clearAgentStorage(): Promise<void>;
}
