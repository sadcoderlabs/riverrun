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
 * Agent state for store
 */
export interface AgentState {
  /** Current agent address (from storage) */
  agentAddress: string | undefined;
  /** All agents for the current user (from blockchain) */
  allAgents: AgentInfo[];
}

/**
 * Result type for operations that may succeed or fail
 */
export type AgentResult<T> = { success: true; data: T } | { success: false; error: Error };

/**
 * Result type for tryGetAgentWallet operation
 */
export interface TryGetAgentResult {
  /** Agent wallet if available and valid */
  agentWallet: AgentWallet | undefined;
  /** Error reason if agent wallet is unavailable */
  errorReason?: string;
}
