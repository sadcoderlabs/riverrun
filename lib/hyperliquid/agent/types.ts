/**
 * Agent-related type definitions
 */

/**
 * Agent information from Hyperliquid blockchain
 */
export interface AgentInfo {
  /** Agent wallet address */
  address: string;
  /** Optional agent name (undefined for unnamed agents) */
  name: string | undefined;
}

/**
 * Result of validating local agent against blockchain
 */
export interface ValidationResult {
  /** Whether the local agent matches the blockchain agent */
  isValid: boolean;
  /** Address of the local agent (if exists) */
  localAddress?: string;
  /** Address of the blockchain agent (if exists) */
  blockchainAddress?: string;
}
