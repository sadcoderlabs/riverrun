import type { Signer } from 'ethers';

export interface WalletPort {
  getActiveWallet(): Promise<{ address: string; signer: Signer } | null>;
}
