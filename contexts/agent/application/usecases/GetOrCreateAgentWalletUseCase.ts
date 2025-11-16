/**
 * GetOrCreateAgentWalletUseCase
 *
 * Single Responsibility: Get existing agent wallet from storage or create a new one
 * Does NOT involve blockchain operations
 */

import { Wallet } from 'ethers';

import type { AgentWallet, GetOrCreateAgentWalletCommand } from '../../ports/types';
import type { AgentStoragePort } from '../ports/AgentStoragePort';

/**
 * UseCase for getting or creating agent wallet from local storage
 */
export class GetOrCreateAgentWalletUseCase {
  constructor(private readonly storage: AgentStoragePort) {}

  /**
   * Execute: Get existing agent wallet or create new one
   * @param command - Command with masterAddress and provider
   * @returns AgentWallet with address and signer
   */
  async execute(command: GetOrCreateAgentWalletCommand): Promise<AgentWallet> {
    const { masterAddress, provider } = command;

    // Try to get existing wallet from storage
    const privateKey = await this.storage.getPrivateKey(masterAddress);
    if (privateKey) {
      try {
        const existingWallet = new Wallet(privateKey).connect(provider);
        const address = await existingWallet.getAddress();
        return { address, signer: existingWallet };
      } catch (error) {
        console.error(
          '[GetOrCreateAgentWalletUseCase] Failed to create wallet from stored private key:',
          error,
        );
        // Fall through to create new wallet
      }
    }

    // Create new wallet and persist it
    const generatedWallet = Wallet.createRandom();
    const newWallet = generatedWallet.connect(provider);

    try {
      await this.storage.setPrivateKey(masterAddress, newWallet.privateKey);
    } catch (error) {
      console.error(
        '[GetOrCreateAgentWalletUseCase] Failed to persist generated agent wallet:',
        error,
      );
    }

    const address = await newWallet.getAddress();
    return { address, signer: newWallet };
  }
}
