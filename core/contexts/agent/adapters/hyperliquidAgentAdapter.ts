/**
 * Hyperliquid Agent Adapter
 * Wraps Hyperliquid SDK for agent blockchain operations
 */

import * as hl from '@nktkas/hyperliquid';

import * as infoClient from '@/lib/hyperliquid/client/infoClient';

import type { AgentInfo } from '../ports/types';

/**
 * Hyperliquid Agent Adapter
 * Handles agent operations on Hyperliquid blockchain
 */
export class HyperliquidAgentAdapter {
  constructor(
    private readonly masterAddress: string,
    private readonly masterExchangeClient: hl.ExchangeClient,
  ) {}

  /**
   * Approve agent on blockchain
   * @param agentAddress - Agent address to approve
   * @param agentName - Name for the agent
   */
  async approveAgent(agentAddress: string, agentName: string): Promise<void> {
    await this.masterExchangeClient.approveAgent({
      agentAddress,
      agentName,
    });
  }

  /**
   * Revoke agent from blockchain using 0x0 address pattern
   * @param agentName - Name of the agent to revoke
   */
  async revokeAgent(agentName: string): Promise<void> {
    await this.masterExchangeClient.approveAgent({
      agentAddress: '0x0000000000000000000000000000000000000000',
      agentName,
    });
  }

  /**
   * Get all agents from blockchain
   * @returns Array of agent information
   */
  async getAgents(): Promise<AgentInfo[]> {
    try {
      const agents = await infoClient.extraAgents({ user: this.masterAddress });
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
   * @param agentAddress - Agent address to verify
   * @returns True if agent is approved
   */
  async verifyApproval(agentAddress: string): Promise<boolean> {
    try {
      const agents = await this.getAgents();
      return agents.some(agent => agent.address.toLowerCase() === agentAddress.toLowerCase());
    } catch (error) {
      console.error('Failed to verify agent approval:', error);
      return false;
    }
  }
}
