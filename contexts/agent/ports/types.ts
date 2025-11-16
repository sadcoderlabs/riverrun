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

//
// UseCase Command Types
//

/**
 * Command for GetOrCreateAgentWalletUseCase
 */
export type GetOrCreateAgentWalletCommand = {
  /** Master wallet address */
  masterAddress: string;
  /** Provider for creating wallet */
  provider: any; // BrowserProvider from ethers
};

/**
 * Command for GetAgentStatusUseCase
 */
export type GetAgentStatusCommand = {
  /** Master wallet address */
  masterAddress: string;
  /** Provider for creating wallet */
  provider: any; // BrowserProvider from ethers
};

/**
 * Result for GetAgentStatusUseCase
 */
export type GetAgentStatusResult = {
  /** Current agent address (from storage) */
  agentAddress: string | undefined;
  /** All agents for the user (from blockchain) */
  allAgents: AgentInfo[];
  /** Whether the current agent is approved */
  isApproved: boolean;
};

/**
 * Command for CheckAgentApprovalUseCase
 */
export type CheckAgentApprovalCommand = {
  /** Agent address to check */
  agentAddress: string;
  /** Master wallet address */
  masterAddress: string;
};

/**
 * Command for ApproveAgentUseCase
 */
export type ApproveAgentCommand = {
  /** Master wallet signer */
  signer: any; // Signer from ethers
  /** Agent address to approve */
  agentAddress: string;
  /** Agent name */
  agentName: string;
};

/**
 * Command for RevokeAgentUseCase
 */
export type RevokeAgentCommand = {
  /** Master wallet signer */
  signer: any; // Signer from ethers
  /** Agent name to revoke */
  agentName: string;
  /** Master wallet address (for storage cleanup) */
  masterAddress: string;
};

/**
 * Command for TryGetAgentWalletUseCase (high-level composition)
 * Empty command - UseCase obtains wallet info from WalletPort
 */
export type TryGetAgentWalletCommand = Record<string, never>;
