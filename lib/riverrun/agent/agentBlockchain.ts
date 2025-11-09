/**
 * Agent blockchain operations
 * Handles on-chain agent approval, revocation, and querying
 */

import * as hl from '@nktkas/hyperliquid';
import * as infoClient from '@/lib/hyperliquid/client/infoClient';

/**
 * Agent information from Hyperliquid blockchain
 */
export interface AgentInfo {
  /** Agent wallet address */
  address: string;
  /** Optional agent name (undefined for unnamed agents) */
  name: string | undefined;
}

// ============================================================================
// Blockchain Operations
// ============================================================================

/**
 * Approve agent on blockchain
 * @param masterExchangeClient - Exchange client with master wallet
 * @param agentAddress - Agent address to approve
 * @param agentName - Name for the agent
 */
export async function approveAgentOnChain(
  masterExchangeClient: hl.ExchangeClient,
  agentAddress: string,
  agentName: string,
): Promise<void> {
  await masterExchangeClient.approveAgent({
    agentAddress,
    agentName,
  });
}

/**
 * Revoke agent from blockchain using 0x0 address pattern
 * @param masterExchangeClient - Exchange client with master wallet
 * @param agentName - Name of the agent to revoke
 */
export async function revokeAgentOnChain(
  masterExchangeClient: hl.ExchangeClient,
  agentName: string,
): Promise<void> {
  await masterExchangeClient.approveAgent({
    agentAddress: '0x0000000000000000000000000000000000000000',
    agentName,
  });
}

/**
 * Get all agents from blockchain
 * @param infoClient - Info client for querying blockchain
 * @param masterAddress - Master wallet address
 * @returns Array of agent information
 */
export async function getAgentsFromChain(
  _infoClient: hl.InfoClient,
  masterAddress: string,
): Promise<AgentInfo[]> {
  try {
    const agents = await infoClient.extraAgents({ user: masterAddress });
    return agents.map((agent: { address: string; name?: string }) => ({
      address: agent.address,
      name: agent.name,
    }));
  } catch (error) {
    console.error('Failed to get agents from chain:', error);
    return [];
  }
}

/**
 * Verify if agent is approved on blockchain
 * @param infoClient - Info client for querying blockchain
 * @param masterAddress - Master wallet address
 * @param agentAddress - Agent address to verify
 * @returns True if agent is approved
 */
export async function verifyAgentApproval(
  infoClient: hl.InfoClient,
  masterAddress: string,
  agentAddress: string,
): Promise<boolean> {
  try {
    const agents = await getAgentsFromChain(infoClient, masterAddress);
    return agents.some(agent => agent.address.toLowerCase() === agentAddress.toLowerCase());
  } catch (error) {
    console.error('Failed to verify agent approval:', error);
    return false;
  }
}
