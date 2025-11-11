/**
 * Hyperliquid Adapter - Unified Infrastructure Adapter
 *
 * This adapter provides a unified interface for all Hyperliquid SDK operations.
 *
 * Design:
 * - Methods receive signer parameter
 * - ExchangeClient is created on each call (low overhead, transport is singleton)
 * - Stateless and simple
 */

import * as hl from '@nktkas/hyperliquid';
import type { Signer } from 'ethers';

import * as infoClient from '@/lib/hyperliquid/client/infoClient';
import { getMasterExchangeClient } from '@/lib/hyperliquid/client/getter';

/**
 * Agent information from blockchain
 */
export interface AgentInfo {
  address: string;
  name: string | undefined;
}

/**
 * Hyperliquid Adapter
 *
 * Provides clean, high-level APIs for Hyperliquid operations.
 */
export class HyperliquidAdapter {
  // ============================================================================
  // Agent Operations
  // ============================================================================

  /**
   * Approve agent on blockchain
   *
   * @param signer - Signer for the master wallet
   * @param agentAddress - Agent address to approve
   * @param agentName - Name for the agent
   */
  async approveAgent(signer: Signer, agentAddress: string, agentName: string): Promise<void> {
    const client = getMasterExchangeClient(signer);
    await client.approveAgent({
      agentAddress,
      agentName,
    });
  }

  /**
   * Revoke agent from blockchain
   *
   * @param signer - Signer for the master wallet
   * @param agentName - Name of the agent to revoke
   */
  async revokeAgent(signer: Signer, agentName: string): Promise<void> {
    const client = getMasterExchangeClient(signer);
    // Revoke by setting agent address to 0x0
    await client.approveAgent({
      agentAddress: '0x0000000000000000000000000000000000000000',
      agentName,
    });
  }

  /**
   * Get all agents for a master address from blockchain
   *
   * @param masterAddress - Master wallet address
   * @returns Array of agent information
   */
  async getAgents(masterAddress: string): Promise<AgentInfo[]> {
    try {
      const agents = await infoClient.extraAgents({ user: masterAddress });
      return agents.map((agent: { address: string; name?: string }) => ({
        address: agent.address,
        name: agent.name,
      }));
    } catch (error) {
      console.error('[HyperliquidAdapter] Failed to get agents:', error);
      return [];
    }
  }

  // ============================================================================
  // Builder Fee Operations
  // ============================================================================

  /**
   * Approve builder fee on blockchain
   *
   * @param signer - Signer for the master wallet
   * @param maxFeeRate - Maximum fee rate as percentage string (e.g., '0.1%')
   * @param builderAddress - Builder address to approve
   */
  async approveBuilderFee(
    signer: Signer,
    maxFeeRate: string,
    builderAddress: string,
  ): Promise<void> {
    const client = getMasterExchangeClient(signer);
    await client.approveBuilderFee({
      maxFeeRate,
      builder: builderAddress,
    });
  }

  /**
   * Get maximum approved builder fee for a user-builder pair
   *
   * @param userAddress - User address
   * @param builderAddress - Builder address
   * @returns Maximum approved fee in 0.1bps units
   */
  async getMaxBuilderFee(userAddress: string, builderAddress: string): Promise<number> {
    try {
      return await infoClient.maxBuilderFee({
        user: userAddress,
        builder: builderAddress,
      });
    } catch (error) {
      console.error('[HyperliquidAdapter] Failed to get max builder fee:', error);
      return 0;
    }
  }
}
