/**
 * SignWalletProofUseCase - Sign a wallet ownership proof message
 *
 * Creates a reusable signature that proves wallet ownership.
 * The signature can be stored and reused for any authenticated API calls.
 */

import type { Signer } from 'ethers';
import type { WalletProof } from '../../adapters/walletProofStore';

export interface SignWalletProofInput {
  signer: Signer;
  address: string;
}

export class SignWalletProofUseCase {
  async execute(input: SignWalletProofInput): Promise<WalletProof> {
    const { signer, address } = input;

    // Create message with action and address (no timestamp for reusability)
    const message = JSON.stringify({
      action: 'wallet_ownership_proof',
      address: address.toLowerCase(),
    });

    // Sign the message using EIP-191 personal sign
    const signature = (await signer.signMessage(message)) as `0x${string}`;

    return { signature, message };
  }
}
