/**
 * Agent Wallet Manager
 * Business logic for agent wallet creation, retrieval, and persistence
 */

import { BaseWallet, BrowserProvider, Wallet } from 'ethers';

import type { AgentWallet } from '../ports/types';
import type { AgentStorageAdapter } from '../adapters/agentStorageAdapter';

/**
 * Agent Wallet Manager
 * Handles the business logic of agent wallet lifecycle management
 */
export class AgentWalletManager {
  constructor(
    private readonly provider: BrowserProvider,
    private readonly storageAdapter: AgentStorageAdapter,
  ) {}

  /**
   * Create a new random agent wallet
   * @returns New agent wallet connected to provider
   * @private
   */
  private async createWallet(): Promise<BaseWallet> {
    const generatedWallet = Wallet.createRandom();
    return generatedWallet.connect(this.provider);
  }

  /**
   * Get existing agent wallet from storage
   * @returns Existing agent wallet or undefined if not found
   * @private
   */
  private async getExistingWallet(): Promise<BaseWallet | undefined> {
    const privateKey = await this.storageAdapter.getPrivateKey();
    if (!privateKey) {
      return undefined;
    }

    try {
      return new Wallet(privateKey).connect(this.provider);
    } catch (error) {
      console.error('Failed to create wallet from stored private key:', error);
      return undefined;
    }
  }

  /**
   * Get existing agent wallet or create new one if doesn't exist
   * This is the main business logic for agent wallet management
   * @returns Agent wallet (existing or newly created)
   */
  async getOrCreateWallet(): Promise<AgentWallet> {
    // Try to get existing wallet
    const existingWallet = await this.getExistingWallet();
    if (existingWallet) {
      const address = await existingWallet.getAddress();
      return { address, signer: existingWallet };
    }

    // Create new wallet and persist it
    const newWallet = await this.createWallet();
    try {
      await this.storageAdapter.setPrivateKey(newWallet.privateKey);
    } catch (error) {
      console.error('Failed to persist generated agent wallet:', error);
    }

    const address = await newWallet.getAddress();
    return { address, signer: newWallet };
  }
}
