/**
 * TryGetAgentWalletUseCase
 *
 * High-level composition UseCase that provides a one-stop solution for getting an agent wallet
 *
 * This UseCase composes fine-grained UseCases to:
 * 1. Get or create agent wallet from storage
 * 2. Check if agent is approved on blockchain
 * 3. If not approved, request user confirmation and approve
 * 4. Return agent wallet or error reason
 *
 * This is a convenience UseCase for cross-context usage (Order, Margin services)
 * while still providing access to fine-grained UseCases for more control.
 *
 * Dependencies:
 * - WalletPort: For getting master wallet info (provider, signer, address)
 * - Fine-grained UseCases: For composing the agent wallet retrieval flow
 */

import { DEFAULT_AGENT_NAME } from '../../constants';
import type { WalletPort } from '@/contexts/wallet/ports/walletPort';
import type { TryGetAgentWalletCommand, TryGetAgentResult } from '../../ports/types';
import { GetOrCreateAgentWalletUseCase } from './GetOrCreateAgentWalletUseCase';
import { ApproveAgentUseCase } from './ApproveAgentUseCase';
import { GetAgentStatusUseCase } from './GetAgentStatusUseCase';

/**
 * High-level UseCase for getting an agent wallet (with automatic approval if needed)
 */
export class TryGetAgentWalletUseCase {
  constructor(
    private readonly walletPort: WalletPort,
    private readonly getOrCreateAgentWallet: GetOrCreateAgentWalletUseCase,
    private readonly approveAgent: ApproveAgentUseCase,
    private readonly getAgentStatus: GetAgentStatusUseCase,
  ) {}

  /**
   * Execute: Try to get agent wallet (with automatic approval flow if needed)
   * No parameters needed - obtains wallet info from WalletPort
   * @returns TryGetAgentResult with agent wallet or error reason
   */
  async execute(_command?: TryGetAgentWalletCommand): Promise<TryGetAgentResult> {
    try {
      // 1. Get active wallet
      const wallet = await this.walletPort.active();
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

      // 2. Get or create agent wallet from storage
      const agentWallet = await this.getOrCreateAgentWallet.execute({
        masterAddress,
        provider,
      });

      // 3. Check if agent is approved on blockchain
      // Use GetAgentStatusUseCase to ensure fresh agent data
      const status = await this.getAgentStatus.execute({
        masterAddress,
        provider,
      });

      const isApproved = status.isApproved;

      if (!isApproved) {
        // 4. Not approved - request approval
        const approved = await this.approveAgent.execute({
          signer,
          agentAddress: agentWallet.address,
          agentName: DEFAULT_AGENT_NAME,
        });

        if (!approved) {
          // User cancelled approval
          return {
            agentWallet: undefined,
            errorReason: 'User cancelled agent approval',
          };
        }

        // Approval succeeded - agent wallet is now ready
      }

      // Agent is approved (either was already approved, or just got approved)
      return {
        agentWallet,
        errorReason: undefined,
      };
    } catch (error) {
      console.error('[TryGetAgentWalletUseCase] Failed to get agent wallet:', error);
      return {
        agentWallet: undefined,
        errorReason: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }
}
