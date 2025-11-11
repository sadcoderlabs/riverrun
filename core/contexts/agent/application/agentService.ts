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

import { BaseWallet, BrowserProvider, Wallet } from 'ethers';

import { DEFAULT_AGENT_NAME } from '../constants';

import { HyperliquidAdapter } from '../../../infra/hyperliquid/hyperliquidAdapter';
import type { WalletPort } from '../../wallet/ports/walletPort';
import { AgentPkStore } from '../adapters/agentPkStore';
import { agentStateStore } from '../adapters/agentStateStore';
import type { AgentPort } from '../ports/agentPort';
import type { AgentApprovalStatus, AgentWallet } from '../ports/types';

/**
 * Context information needed for agent operations
 */
interface AgentOperationContext {
  masterAddress: string;
  provider: BrowserProvider;
  storageAdapter: AgentPkStore;
}

/**
 * AgentService implementation
 */
export class AgentService implements AgentPort {
  constructor(
    private readonly walletService: WalletPort,
    private readonly hyperliquidAdapter: HyperliquidAdapter,
  ) {}

  /**
   * Get operation context with all necessary adapters
   * @private
   */
  private async getContext(): Promise<AgentOperationContext | undefined> {
    // Get active wallet from wallet service
    const wallet = await this.walletService.active();
    if (!wallet) {
      return undefined;
    }

    // Get provider from wallet
    const provider = await wallet.getProvider();
    if (!provider) {
      return undefined;
    }

    // Get signer from provider
    const signer = await provider.getSigner();
    const masterAddress = await signer.getAddress();

    // Create storage adapter
    const storageAdapter = new AgentPkStore(masterAddress);

    return {
      masterAddress,
      provider,
      storageAdapter,
    };
  }

  /**
   * Create a new random agent wallet
   * @private
   */
  private async createAgentWallet(provider: BrowserProvider): Promise<BaseWallet> {
    const generatedWallet = Wallet.createRandom();
    return generatedWallet.connect(provider);
  }

  /**
   * Get existing agent wallet from storage
   * @private
   */
  private async getExistingAgentWallet(
    provider: BrowserProvider,
    storageAdapter: AgentPkStore,
  ): Promise<BaseWallet | undefined> {
    const privateKey = await storageAdapter.getPrivateKey();
    if (!privateKey) {
      return undefined;
    }

    try {
      return new Wallet(privateKey).connect(provider);
    } catch (error) {
      console.error('Failed to create wallet from stored private key:', error);
      return undefined;
    }
  }

  /**
   * Get existing agent wallet or create new one if doesn't exist
   * This is the main business logic for agent wallet management
   * @private
   */
  private async getOrCreateAgentWalletInternal(
    provider: BrowserProvider,
    storageAdapter: AgentPkStore,
  ): Promise<AgentWallet> {
    // Try to get existing wallet
    const existingWallet = await this.getExistingAgentWallet(provider, storageAdapter);
    if (existingWallet) {
      const address = await existingWallet.getAddress();
      return { address, signer: existingWallet };
    }

    // Create new wallet and persist it
    const newWallet = await this.createAgentWallet(provider);
    try {
      await storageAdapter.setPrivateKey(newWallet.privateKey);
    } catch (error) {
      console.error('Failed to persist generated agent wallet:', error);
    }

    const address = await newWallet.getAddress();
    return { address, signer: newWallet };
  }

  /**
   * Verify if agent is approved on blockchain (business logic)
   * @private
   */
  private async verifyAgentApprovalOnChain(
    masterAddress: string,
    agentAddress: string,
  ): Promise<boolean> {
    try {
      const agents = await this.hyperliquidAdapter.getAgents(masterAddress);
      return agents.some(agent => agent.address.toLowerCase() === agentAddress.toLowerCase());
    } catch (error) {
      console.error('Failed to verify agent approval:', error);
      return false;
    }
  }

  /**
   * Check approval status for the current agent
   * Also updates allAgents in the store
   */
  async checkApprovalStatus(): Promise<AgentApprovalStatus> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        return { agentAddress: undefined, isApproved: false };
      }

      // Get or create agent wallet
      const agentWallet = await this.getOrCreateAgentWalletInternal(
        ctx.provider,
        ctx.storageAdapter,
      );

      // Check if agent is approved on blockchain
      const isApproved = await this.verifyAgentApprovalOnChain(
        ctx.masterAddress,
        agentWallet.address,
      );

      console.log('checkApprovalStatus:', {
        agentAddress: agentWallet.address,
        isApproved,
      });

      // Update store with status
      agentStateStore.getState().updateState({
        agentAddress: agentWallet.address,
        isApproved,
      });

      // Also refresh all agents list
      await this.getAllAgentsInternal(ctx.masterAddress);

      return { agentAddress: agentWallet.address, isApproved };
    } catch (error) {
      console.error('Failed to check agent approval status:', error);
      agentStateStore.getState().updateState({
        agentAddress: undefined,
        isApproved: false,
      });
      return { agentAddress: undefined, isApproved: false };
    }
  }

  /**
   * Approve the Riverrun Agent on blockchain
   */
  async approveAgent(): Promise<boolean> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        throw new Error('Failed to get wallet context');
      }

      // Get or create agent wallet
      const agentWallet = await this.getOrCreateAgentWalletInternal(
        ctx.provider,
        ctx.storageAdapter,
      );

      // Get signer for blockchain operation
      const signer = await ctx.provider.getSigner();

      // Approve agent on blockchain
      await this.hyperliquidAdapter.approveAgent(signer, agentWallet.address, DEFAULT_AGENT_NAME);

      // Verify approval
      const isApproved = await this.verifyAgentApprovalOnChain(
        ctx.masterAddress,
        agentWallet.address,
      );

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
    }
  }

  /**
   * Revoke a named agent from blockchain
   */
  async revokeAgent(agentName: string): Promise<boolean> {
    try {
      const ctx = await this.getContext();
      if (!ctx) {
        throw new Error('Failed to get wallet context');
      }

      const isRiverrunAgent = agentName === DEFAULT_AGENT_NAME;

      // Get signer for blockchain operation
      const signer = await ctx.provider.getSigner();

      // Revoke agent on blockchain
      await this.hyperliquidAdapter.revokeAgent(signer, agentName);

      // Clear local storage for Riverrun Agent
      if (isRiverrunAgent) {
        await ctx.storageAdapter.clearPrivateKey();
      }

      // Verify revocation
      const agents = await this.hyperliquidAdapter.getAgents(ctx.masterAddress);
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
      await this.getAllAgentsInternal(ctx.masterAddress);

      return true;
    } catch (error) {
      console.error('Failed to revoke agent:', error);
      throw error;
    }
  }

  /**
   * Get all agents from blockchain and update store (private method)
   * @private
   */
  private async getAllAgentsInternal(masterAddress: string): Promise<void> {
    try {
      const agents = await this.hyperliquidAdapter.getAgents(masterAddress);
      agentStateStore.getState().setAllAgents(agents);
    } catch (error) {
      console.error('Failed to get all agents:', error);
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

    return this.getOrCreateAgentWalletInternal(ctx.provider, ctx.storageAdapter);
  }
}
