/**
 * BuilderFeeApprovalAdapter
 *
 * Adapter that implements order context's BuilderFeeApprovalPort.
 * This adapter wraps the EnsureBuilderFeeApprovalUseCase and provides
 * a simplified interface for the order context.
 *
 * Design Pattern: Adapter (Hexagonal Architecture)
 * - Implements the port interface defined by order context
 * - Adapts the use case to the port's needs
 * - Enables cross-context dependencies through abstraction
 *
 * Flow:
 * Order Context (needs approval) → BuilderFeeApprovalPort (interface)
 *   → BuilderFeeApprovalAdapter (this class) → EnsureBuilderFeeApprovalUseCase
 */

import type { Signer } from 'ethers';
import type { BuilderFeeApprovalPort } from '../../order/application/ports/BuilderFeeApprovalPort';
import type { EnsureBuilderFeeApprovalUseCase } from '../application/usecases/EnsureBuilderFeeApprovalUseCase';

export class BuilderFeeApprovalAdapter implements BuilderFeeApprovalPort {
  constructor(private readonly ensureApprovalUseCase: EnsureBuilderFeeApprovalUseCase) {}

  async ensureApproval(walletAddress: string, signer: Signer): Promise<boolean> {
    return await this.ensureApprovalUseCase.execute({ walletAddress, signer });
  }
}
