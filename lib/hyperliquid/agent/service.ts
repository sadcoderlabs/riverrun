/**
 * Agent service layer
 * Consolidates core operations, blockchain interactions, and validation logic
 */

import * as hl from '@nktkas/hyperliquid';
import { BaseWallet, BrowserProvider, Wallet } from 'ethers';
import { AGENT_APPROVAL_WAIT_TIME } from './constants';
import { getAgentPrivateKey, setAgentPrivateKey } from './storage';
import { type AgentInfo } from './types';

// ============================================================================
// Core Agent Operations
// ============================================================================

/**
 * Create a new random agent wallet
 * @param provider - Browser provider to connect wallet
 * @returns New agent wallet connected to provider
 */
export async function createAgentSigner(provider: BrowserProvider): Promise<BaseWallet> {
  const generatedWallet = Wallet.createRandom();
  return generatedWallet.connect(provider);
}

/**
 * Get existing agent signer from storage
 * @param masterAddress - Master wallet address
 * @param provider - Browser provider to connect wallet
 * @returns Existing agent wallet or null if not found
 */
export async function getAgentSigner(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<BaseWallet | null> {
  const privateKey = await getAgentPrivateKey(masterAddress);
  if (!privateKey) {
    return null;
  }

  try {
    return new Wallet(privateKey).connect(provider);
  } catch (error) {
    console.error('Failed to create wallet from stored private key:', error);
    return null;
  }
}

/**
 * Get existing agent signer or create new one if doesn't exist
 * @param masterAddress - Master wallet address
 * @param provider - Browser provider to connect wallet
 * @returns Agent wallet (existing or newly created)
 */
export async function getOrCreateAgentSigner(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<BaseWallet> {
  // Try to get existing signer
  const existingSigner = await getAgentSigner(masterAddress, provider);
  if (existingSigner) {
    return existingSigner;
  }

  // Create new signer and store it
  const newSigner = await createAgentSigner(provider);
  try {
    await setAgentPrivateKey(masterAddress, newSigner.privateKey);
  } catch (error) {
    console.error('Failed to persist generated agent signer:', error);
  }

  return newSigner;
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

  // Wait for blockchain propagation
  await new Promise(resolve => setTimeout(resolve, AGENT_APPROVAL_WAIT_TIME));
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

  // Wait for blockchain propagation
  await new Promise(resolve => setTimeout(resolve, AGENT_APPROVAL_WAIT_TIME));
}

/**
 * Get all agents from blockchain
 * @param infoClient - Info client for querying blockchain
 * @param masterAddress - Master wallet address
 * @returns Array of agent information
 */
export async function getAgentsFromChain(
  infoClient: hl.InfoClient,
  masterAddress: string,
): Promise<AgentInfo[]> {
  try {
    const agents = await infoClient.extraAgents({ user: masterAddress });
    return agents.map(agent => ({
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
