import type { Signer } from 'ethers';

export interface BuilderFeeExchangePort {
  getMaxFeeBps(walletAddress: string, builderAddress: string): Promise<number>;
  approveFee(params: {
    signer: Signer;
    builderAddress: string;
    maxFeeRateBps: number;
  }): Promise<void>;
}
