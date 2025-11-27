import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from 'zustand/vanilla';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useStore } from 'zustand';

export interface WalletProof {
  signature: `0x${string}`;
  message: string;
}

interface WalletProofState {
  /**
   * Stored wallet ownership proofs, keyed by lowercase wallet address.
   * Each proof contains a signature and the original message that was signed.
   */
  proofs: Record<string, WalletProof>;

  /**
   * Store a wallet ownership proof for an address
   */
  setProof: (address: string, proof: WalletProof) => void;

  /**
   * Get the stored proof for an address (returns undefined if not found)
   */
  getProof: (address: string) => WalletProof | undefined;

  /**
   * Check if a proof exists for an address
   */
  hasProof: (address: string) => boolean;

  /**
   * Clear the stored proof for an address
   */
  clearProof: (address: string) => void;

  _hasHydrated: boolean;
  _setHasHydrated: (state: boolean) => void;
}

/**
 * Wallet Proof Store (Vanilla Zustand)
 *
 * Stores wallet ownership proof signatures with persistence.
 * Signatures are keyed by lowercase wallet address and can be reused
 * for any API calls requiring wallet ownership verification.
 */
export const walletProofStore = createStore<WalletProofState>()(
  persist(
    (set, get) => ({
      proofs: {},

      setProof: (address, proof) =>
        set(state => ({
          proofs: { ...state.proofs, [address.toLowerCase()]: proof },
        })),

      getProof: address => get().proofs[address.toLowerCase()],

      hasProof: address => address.toLowerCase() in get().proofs,

      clearProof: address =>
        set(state => {
          const { [address.toLowerCase()]: _, ...rest } = state.proofs;
          return { proofs: rest };
        }),

      _hasHydrated: false,
      _setHasHydrated: state => set({ _hasHydrated: state }),
    }),
    {
      name: 'wallet-proof-storage',
      storage: createJSONStorage(() => AsyncStorage),
      onRehydrateStorage: () => state => {
        if (state) state._setHasHydrated(true);
      },
    },
  ),
);

/**
 * React hook for accessing wallet proof store
 */
export const useWalletProofStore = () => useStore(walletProofStore);
