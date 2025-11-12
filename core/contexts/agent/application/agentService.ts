/**
 * AgentService - Core business logic for agent operations
 *
 * This service implements the AgentPort interface with 3 essential methods:
 * 1. tryGetAgentWallet() - Get or create agent wallet (for trading)
 * 2. loadAllAgents() - Load all agents from blockchain (for initialization)
 * 3. revoke() - Revoke an agent (for management)
 *
 * Design principles:
 * - Pure business logic (no React dependencies)
 * - Uses adapters for external operations (blockchain, storage)
 * - Updates agentStateStore for reactive UI
 * - Depends on wallet context for master wallet information
 * - Auto-syncs agent state when wallet changes (subscribes to activeWalletStore in constructor)
 */

import { BrowserProvider, Wallet } from 'ethers';

import { DEFAULT_AGENT_NAME } from '../constants';

import { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import type { WalletPort } from '../../wallet/ports/walletPort';
import { AgentPkStore } from '../adapters/agentPkStore';
import { agentStateStore } from '../adapters/agentStateStore';
import { activeWalletStore } from '../../wallet/adapters/activeWalletStore';
import type { AgentPort } from '../ports/agentPort';
import type { AgentWallet, TryGetAgentResult } from '../ports/types';

/**
 * AgentService implementation
 */
export class AgentService implements AgentPort {
  private readonly agentPkStore: AgentPkStore;

  constructor(
    private readonly walletService: WalletPort,
    private readonly hyperliquidGateway: HyperliquidGateway,
  ) {
    // Create stateless storage adapter
    this.agentPkStore = new AgentPkStore();

    // Auto-sync: subscribe to wallet changes and reload agents
    activeWalletStore.subscribe((state, prevState) => {
      if (state.wallet?.address !== prevState.wallet?.address) {
        void this.loadAllAgents();
      }
    });
  }

  /**
   * Get existing agent wallet or create new one if doesn't exist
   * @private
   */
  private async getOrCreateAgentWallet(
    masterAddress: string,
    provider: BrowserProvider,
  ): Promise<AgentWallet> {
    // Try to get existing wallet from storage
    const privateKey = await this.agentPkStore.getPrivateKey(masterAddress);
    if (privateKey) {
      try {
        const existingWallet = new Wallet(privateKey).connect(provider);
        const address = await existingWallet.getAddress();
        return { address, signer: existingWallet };
      } catch (error) {
        console.error('Failed to create wallet from stored private key:', error);
        // Fall through to create new wallet
      }
    }

    // Create new wallet and persist it
    const generatedWallet = Wallet.createRandom();
    const newWallet = generatedWallet.connect(provider);

    try {
      await this.agentPkStore.setPrivateKey(masterAddress, newWallet.privateKey);
    } catch (error) {
      console.error('Failed to persist generated agent wallet:', error);
    }

    const address = await newWallet.getAddress();
    return { address, signer: newWallet };
  }

  /**
   * Load all agents from blockchain
   *
   * This method fetches all agents and updates the store with both
   * agentAddress (from storage) and allAgents (from blockchain).
   */
  async loadAllAgents(): Promise<void> {
    try {
      // Get active wallet
      const wallet = await this.walletService.active();
      if (!wallet) {
        // No wallet connected - clear state
        agentStateStore.getState().updateState({
          agentAddress: undefined,
          allAgents: [],
        });
        return;
      }

      // Get provider and master address
      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();
      const masterAddress = await signer.getAddress();

      // Get or create agent wallet (to populate agentAddress)
      const agentWallet = await this.getOrCreateAgentWallet(masterAddress, provider);

      // Fetch all agents from blockchain
      const agents = await this.hyperliquidGateway.getAgents(masterAddress);

      // Update store with both agentAddress and allAgents
      agentStateStore.getState().updateState({
        agentAddress: agentWallet.address,
        allAgents: agents,
      });

      console.log('loadAllAgents:', {
        agentAddress: agentWallet.address,
        allAgentsCount: agents.length,
      });
    } catch (error) {
      console.error('Failed to load agents:', error);
      agentStateStore.getState().updateState({
        agentAddress: undefined,
        allAgents: [],
      });
    }
  }

  /**
   * Try to get agent wallet for trading
   *
   * Simplified flow:
   * 1. Get or create agent wallet from storage
   * 2. Check if approved in allAgents
   * 3. If not approved, approve it on blockchain
   * 4. Return agent wallet
   */
  async tryGetAgentWallet(): Promise<TryGetAgentResult> {
    try {
      // Get active wallet
      const wallet = await this.walletService.active();
      if (!wallet) {
        return {
          agentWallet: undefined,
          errorReason: 'No active wallet connected',
        };
      }

      // Get provider and master address
      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();
      const masterAddress = await signer.getAddress();

      // 1. Get or create agent wallet
      const agentWallet = await this.getOrCreateAgentWallet(masterAddress, provider);

      // 2. Ensure allAgents is loaded
      const currentAgents = agentStateStore.getState().allAgents;
      if (currentAgents.length === 0) {
        await this.loadAllAgents();
      }

      // 3. Check if approved
      const updatedAgents = agentStateStore.getState().allAgents;
      const isApproved = updatedAgents.some(
        agent => agent.address.toLowerCase() === agentWallet.address.toLowerCase(),
      );

      if (isApproved) {
        // Already approved, return it
        return {
          agentWallet,
          errorReason: undefined,
        };
      }

      // 4. Not approved - approve it on blockchain
      await this.hyperliquidGateway.approveAgent(signer, agentWallet.address, DEFAULT_AGENT_NAME);

      // 5. Update store and reload
      agentStateStore.getState().updateState({
        agentAddress: agentWallet.address,
      });
      await this.loadAllAgents();

      return {
        agentWallet,
        errorReason: undefined,
      };
    } catch (error) {
      console.error('Failed to get agent wallet:', error);
      return {
        agentWallet: undefined,
        errorReason: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Revoke a named agent from blockchain
   */
  async revoke(agentName: string): Promise<boolean> {
    try {
      // Get active wallet
      const wallet = await this.walletService.active();
      if (!wallet) {
        throw new Error('No active wallet connected');
      }

      // Get provider and master address
      const provider = await wallet.getProvider();
      const signer = await provider.getSigner();
      const masterAddress = await signer.getAddress();

      const isRiverrunAgent = agentName === DEFAULT_AGENT_NAME;

      // Revoke agent on blockchain
      await this.hyperliquidGateway.revokeAgent(signer, agentName);

      // Clear local storage for Riverrun Agent
      if (isRiverrunAgent) {
        await this.agentPkStore.clearPrivateKey(masterAddress);
      }

      // Verify revocation
      const agents = await this.hyperliquidGateway.getAgents(masterAddress);
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
        });
      }

      // Refresh all agents list
      await this.loadAllAgents();

      return true;
    } catch (error) {
      console.error('Failed to revoke agent:', error);
      throw error;
    }
  }
}
