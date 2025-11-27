import { useCallback, useMemo } from 'react';
import { useWallet } from './useWallet';
import {
  useWalletProofStore,
  type WalletProof,
} from '../../../../contexts/wallet/adapters/walletProofStore';
import { SignWalletProofUseCase } from '../../../../contexts/wallet/application/usecases/SignWalletProofUseCase';

export interface UseWalletOwnershipProofResult {
  /**
   * Whether the current wallet has a stored ownership signature.
   */
  isSigned: boolean;

  /**
   * Request a wallet ownership signature.
   * Returns cached signature if available, otherwise prompts for signing.
   *
   * @throws Error if wallet is not connected or user rejects signing
   */
  requestSignature: () => Promise<WalletProof>;

  /**
   * Clear the stored signature for the current wallet.
   * Next call to requestSignature() will prompt for a new signature.
   */
  clearSignature: () => void;
}

const signWalletProofUseCase = new SignWalletProofUseCase();

/**
 * useWalletOwnershipProof - Manage wallet ownership proof signatures
 *
 * This hook provides a way to sign and cache wallet ownership proofs.
 * The signature is stored locally and can be reused for any API calls
 * that require wallet ownership verification.
 *
 * @example
 * ```tsx
 * const { isSigned, requestSignature, clearSignature } = useWalletOwnershipProof();
 *
 * // Request signature (returns cached or prompts signing)
 * const proof = await requestSignature();
 * await someApiCall({ proof, ...params });
 *
 * // Check if already signed
 * if (isSigned) {
 *   // Can use cached signature
 * }
 *
 * // Revoke signature
 * clearSignature();
 * ```
 */
export function useWalletOwnershipProof(): UseWalletOwnershipProofResult {
  const { wallet, address, getSigner } = useWallet();
  const { hasProof, getProof, setProof, clearProof } = useWalletProofStore();

  const isSigned = useMemo(() => {
    if (!address) return false;
    return hasProof(address);
  }, [address, hasProof]);

  const requestSignature = useCallback(async (): Promise<WalletProof> => {
    if (!wallet || !address) {
      throw new Error('Wallet not connected');
    }

    // Return cached proof if available
    const existingProof = getProof(address);
    if (existingProof) {
      return existingProof;
    }

    // Sign new proof
    const signer = await getSigner();
    const proof = await signWalletProofUseCase.execute({ signer, address });

    // Store for future use
    setProof(address, proof);

    return proof;
  }, [wallet, address, getSigner, getProof, setProof]);

  const clearSignature = useCallback(() => {
    if (address) {
      clearProof(address);
    }
  }, [address, clearProof]);

  return {
    isSigned,
    requestSignature,
    clearSignature,
  };
}
