import type { BuilderFeeExchangePort } from '../ports/BuilderFeeExchangePort';
import type { BuilderFeeConfirmationPort } from '../ports/BuilderFeeConfirmationPort';
import type { BuilderFeeStatePort, BuilderFeeStatus } from '../ports/BuilderFeeStatePort';
import type { WalletPort } from '../ports/WalletPort';
import { BUILDER_FEE_CONFIG } from '../../config/builderFeeConfig';

export class EnsureBuilderFeeApprovalUseCase {
  constructor(
    private readonly wallet: WalletPort,
    private readonly exchange: BuilderFeeExchangePort,
    private readonly confirmation: BuilderFeeConfirmationPort,
    private readonly state: BuilderFeeStatePort,
  ) {}

  private async refreshStatus(walletAddress: string): Promise<BuilderFeeStatus> {
    const maxFee = await this.exchange.getMaxFeeBps(
      walletAddress,
      BUILDER_FEE_CONFIG.builderAddress,
    );
    const status: BuilderFeeStatus = {
      maxApprovedFeeBps: maxFee,
      isApproved: maxFee >= BUILDER_FEE_CONFIG.requiredFeeRateBps,
    };
    this.state.updateStatus(status);
    return status;
  }

  async execute(): Promise<BuilderFeeStatus> {
    const active = await this.wallet.getActiveWallet();
    if (!active) {
      const status: BuilderFeeStatus = { isApproved: false, maxApprovedFeeBps: 0 };
      this.state.updateStatus(status);
      return status;
    }

    const status = await this.refreshStatus(active.address);
    if (status.isApproved) {
      return status;
    }

    const confirmed = await this.confirmation.confirmApproval({
      requiredFeeRateBps: BUILDER_FEE_CONFIG.requiredFeeRateBps,
    });
    if (!confirmed) {
      return status;
    }

    await this.exchange.approveFee({
      signer: active.signer,
      builderAddress: BUILDER_FEE_CONFIG.builderAddress,
      maxFeeRateBps: BUILDER_FEE_CONFIG.maxFeeRateBps,
    });

    return this.refreshStatus(active.address);
  }
}
