import type {
  BuilderFeeApprovalPort,
  BuilderFeeApprovalRequest,
} from '../../../order/application/ports/BuilderFeeApprovalPort';
import type { EnsureBuilderFeeApprovalUseCase } from '../usecases/EnsureBuilderFeeApprovalUseCase';

export class BuilderFeeApprovalAdapter implements BuilderFeeApprovalPort {
  constructor(private readonly ensureUseCase: EnsureBuilderFeeApprovalUseCase) {}

  async ensureApproved(_: BuilderFeeApprovalRequest): Promise<void> {
    const status = await this.ensureUseCase.execute();
    if (!status.isApproved) {
      throw new Error('Builder fee approval rejected by user');
    }
  }
}
