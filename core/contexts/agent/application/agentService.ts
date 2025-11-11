/**
 * AgentService - Core business logic for agent operations
 *
 * This service implements the AgentPort interface and coordinates
 * agent-related operations including approval, revocation, and wallet management.
 *
 * Design principles:
 * - Pure business logic (no React dependencies)
 * - Uses adapters for external operations (blockchain, storage, wallet creation)
 * - Updates agentStateStore for reactive UI
 * - Depends on wallet context for master wallet information
 */

import * as hl from '@nktkas/hyperliquid';
import { getWalletAddress } from '@nktkas/hyperliquid/signing';

import { DEFAULT_AGENT_NAME } from '@/lib/riverrun/agent/constants';

import type { AgentPort } from '../ports/agentPort';
import type { AgentApprovalStatus, AgentInfo, AgentWallet } from '../ports/types';
import type { ActiveWallet } from '../../wallet/ports/types';
import { HyperliquidAgentAdapter } from '../adapters/hyperliquidAgentAdapter';
import { AgentStorageAdapter } from '../adapters/agentStorageAdapter';
import { AgentSignerAdapter } from '../adapters/agentSignerAdapter';
import { agentStateStore } from '../adapters/agentStateStore';

/**
 * Context information needed for agent operations
 */
interface AgentOperationContext {
  masterAddress: string;
  masterExchangeClient: hl.ExchangeClient;
  wallet: ActiveWallet;
  blockchainAdapter: HyperliquidAgentAdapter;
  storageAdapter: AgentStorageAdapter;
  signerAdapter: AgentSignerAdapter;
}

/**
 * AgentService implementation
 */
export class AgentService implements AgentPort {
  constructor(
    private getMasterExchangeClient: () => Promise<hl.ExchangeClient | undefined>,
    private getActiveWallet: () => Promise<ActiveWallet | undefined>,
  ) {}

  /**
   * Get operation context with all necessary adapters
   * @private
   */
  private async getContext(): Promise<AgentOperationContext | undefined> {
    const masterExchangeClient = await this.getMasterExchangeClient();
    if (!masterExchangeClient) {
      return undefined;
    }

    const wallet = await this.getActiveWallet();
    if (!wallet) {
      return undefined;
    }

    const provider = await wallet.getProvider();
    if (!provider) {
      return undefined;
    }

    const masterAddress = await getWalletAddress(masterExchangeClient.wallet);

    // Create adapters
    const blockchainAdapter = new HyperliquidAgentAdapter(masterAddress, masterExchangeClient);
    const storageAdapter = new AgentStorageAdapter(masterAddress);
    const signerAdapter = new AgentSignerAdapter(provider, storageAdapter);

    return {
      masterAddress,
      masterExchangeClient,
      wallet,
      blockchainAdapter,
      storageAdapter,
      signerAdapter,
    };
  }

  /**
   * Check approval status for the current agent
   */
  async checkApprovalStatus(): Promise<AgentApprovalStatus> {
    try {
      agentStateStore.getState().setIsLoading(true);

      const ctx = await this.getContext();
      if (!ctx) {
        return { agentAddress: undefined, isApproved: false };
      }

      // Get or create agent wallet
      const agentWallet = await ctx.signerAdapter.getOrCreateAgentSigner();

      // Check if agent is approved on blockchain
      const isApproved = await ctx.blockchainAdapter.verifyApproval(agentWallet.address);

      console.log('checkApprovalStatus:', {
        agentAddress: agentWallet.address,
        isApproved,
      });

      // Update store
      agentStateStore.getState().updateState({
        agentAddress: agentWallet.address,
        isApproved,
      });

      return { agentAddress: agentWallet.address, isApproved };
    } catch (error) {
      console.error('Failed to check agent approval status:', error);
      agentStateStore.getState().updateState({
        agentAddress: undefined,
        isApproved: false,
      });
      return { agentAddress: undefined, isApproved: false };
    } finally {
      agentStateStore.getState().setIsLoading(false);
    }
  }

  /**
   * Approve the Riverrun Agent on blockchain
   */
  async approveAgent(): Promise<boolean> {
    try {
      agentStateStore.getState().setIsLoading(true);

      const ctx = await this.getContext();
      if (!ctx) {
        throw new Error('Failed to get wallet context');
      }

      // Get or create agent wallet
      const agentWallet = await ctx.signerAdapter.getOrCreateAgentSigner();

      // Approve agent on blockchain
      await ctx.blockchainAdapter.approveAgent(agentWallet.address, DEFAULT_AGENT_NAME);

      // Verify approval
      const isApproved = await ctx.blockchainAdapter.verifyApproval(agentWallet.address);

      if (!isApproved) {
        throw new Error('Agent approval was not confirmed on blockchain');
      }

      // Update store
      agentStateStore.getState().updateState({
        agentAddress: agentWallet.address,
        isApproved: true,
      });

      return true;
    } catch (error) {
      console.error('Failed to approve agent:', error);
      throw error;
    } finally {
      agentStateStore.getState().setIsLoading(false);
    }
  }

  /**
   * Revoke a named agent from blockchain
   */
  async revokeAgent(agentName: string): Promise<boolean> {
    try {
      agentStateStore.getState().setIsLoading(true);

      const ctx = await this.getContext();
      if (!ctx) {
        throw new Error('Failed to get wallet context');
      }

      const isRiverrunAgent = agentName === DEFAULT_AGENT_NAME;

      // Revoke agent on blockchain
      await ctx.blockchainAdapter.revokeAgent(agentName);

      // Clear local storage for Riverrun Agent
      if (isRiverrunAgent) {
        await ctx.storageAdapter.clearPrivateKey();
      }

      // Verify revocation
      const agents = await ctx.blockchainAdapter.getAgents();
      const stillExists = agents.some(
        agent => agent.name?.toLowerCase() === agentName.toLowerCase(),
      );

      if (stillExists) {
        throw new Error('Agent revocation was not confirmed on blockchain');
      }

      // Update state if Riverrun Agent
      if (isRiverrunAgent) {
        agentStateStore.getState().updateState({
          agentAddress: undefined,
          isApproved: false,
        });
      }

      // Refresh all agents list
      await this.getAllAgents();

      return true;
    } catch (error) {
      console.error('Failed to revoke agent:', error);
      throw error;
    } finally {
      agentStateStore.getState().setIsLoading(false);
    }
  }

  /**
   * Get all agents for the current user from blockchain
   */
  async getAllAgents(): Promise<AgentInfo[]> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        return [];
      }

      const agents = await ctx.blockchainAdapter.getAgents();
      agentStateStore.getState().setAllAgents(agents);
      return agents;
    } catch (error) {
      console.error('Failed to get all agents:', error);
      return [];
    }
  }

  /**
   * Get or create agent wallet for the current user
   */
  async getOrCreateAgentWallet(): Promise<AgentWallet> {
    const ctx = await this.getContext();
    if (!ctx) {
      throw new Error('Failed to get wallet context');
    }

    return ctx.signerAdapter.getOrCreateAgentSigner();
  }

  /**
   * Count named agents on blockchain for current user
   */
  async countNamedAgents(): Promise<number> {
    try {
      const agents = await this.getAllAgents();
      return agents.filter(agent => agent.name).length;
    } catch (error) {
      console.error('Failed to count named agents:', error);
      return 0;
    }
  }

  /**
   * Check if agent private key exists in local storage
   */
  async hasAgentInStorage(): Promise<boolean> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        return false;
      }

      return ctx.storageAdapter.hasPrivateKey();
    } catch (error) {
      console.error('Failed to check agent in storage:', error);
      return false;
    }
  }

  /**
   * Verify if specific agent address is approved on blockchain
   */
  async verifyAgentApproval(agentAddress: string): Promise<boolean> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        return false;
      }

      return ctx.blockchainAdapter.verifyApproval(agentAddress);
    } catch (error) {
      console.error('Failed to verify agent approval:', error);
      return false;
    }
  }

  /**
   * Find agent by name from all agents
   */
  async findAgentByName(agentName: string): Promise<AgentInfo | undefined> {
    try {
      const agents = await this.getAllAgents();
      return agents.find(agent => agent.name?.toLowerCase() === agentName.toLowerCase());
    } catch (error) {
      console.error('Failed to find agent by name:', error);
      return undefined;
    }
  }

  /**
   * Clear agent data from local storage
   */
  async clearAgentStorage(): Promise<void> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        return;
      }

      await ctx.storageAdapter.clearPrivateKey();

      // Reset state
      agentStateStore.getState().reset();
    } catch (error) {
      console.error('Failed to clear agent storage:', error);
      throw error;
    }
  }
}
