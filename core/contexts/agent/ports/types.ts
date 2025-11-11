import type { BaseWallet } from 'ethers';

/**
 * Agent information from blockchain
 */
export interface AgentInfo {
  /** Agent wallet address */
  address: string;
  /** Optional agent name (undefined for unnamed agents) */
  name: string | undefined;
}

/**
 * Agent wallet with ethers signer
 */
export interface AgentWallet {
  /** Agent address */
  address: string;
  /** Ethers wallet signer */
  signer: BaseWallet;
}

/**
 * Agent approval status
 */
export interface AgentApprovalStatus {
  /** Agent address (undefined if not created yet) */
  agentAddress: string | undefined;
  /** Whether the agent is approved on blockchain */
  isApproved: boolean;
}

/**
 * Agent state for store
 */
export interface AgentState {
  /** Current agent address */
  agentAddress: string | undefined;
  /** Whether agent is approved */
  isApproved: boolean;
  /** All agents for the current user */
  allAgents: AgentInfo[];
}

/**
 * Result type for operations that may succeed or fail
 */
export type AgentResult<T> = { success: true; data: T } | { success: false; error: Error };
