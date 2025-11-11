/**
 * Agent Signer Adapter
 * Handles creation and retrieval of agent wallets using ethers
 */

import { BaseWallet, BrowserProvider, Wallet } from 'ethers';

import type { AgentWallet } from '../ports/types';
import type { AgentStorageAdapter } from './agentStorageAdapter';

/**
 * Agent Signer Adapter
 * Manages agent wallet creation, retrieval, and persistence
 */
export class AgentSignerAdapter {
  constructor(
    private readonly provider: BrowserProvider,
    private readonly storageAdapter: AgentStorageAdapter,
  ) {}

  /**
   * Create a new random agent wallet
   * @returns New agent wallet connected to provider
   */
  private async createAgentSigner(): Promise<BaseWallet> {
    const generatedWallet = Wallet.createRandom();
    return generatedWallet.connect(this.provider);
  }

  /**
   * Get existing agent signer from storage
   * @returns Existing agent wallet or undefined if not found
   */
  private async getAgentSigner(): Promise<BaseWallet | undefined> {
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
   * Get existing agent signer or create new one if doesn't exist
   * @returns Agent wallet (existing or newly created)
   */
  async getOrCreateAgentSigner(): Promise<AgentWallet> {
    // Try to get existing signer
    const existingSigner = await this.getAgentSigner();
    if (existingSigner) {
      const address = await existingSigner.getAddress();
      return { address, signer: existingSigner };
    }

    // Create new signer and store it
    const newSigner = await this.createAgentSigner();
    try {
      await this.storageAdapter.setPrivateKey(newSigner.privateKey);
    } catch (error) {
      console.error('Failed to persist generated agent signer:', error);
    }

    const address = await newSigner.getAddress();
    return { address, signer: newSigner };
  }
}
