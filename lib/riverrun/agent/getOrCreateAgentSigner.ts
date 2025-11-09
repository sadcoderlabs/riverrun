/**
 * Agent signer management utilities
 * Handles creation, retrieval, and persistence of agent wallets
 */

import { BaseWallet, BrowserProvider, Wallet } from 'ethers';
import { getAgentPrivateKey, setAgentPrivateKey } from './agentPkStore';

/**
 * Create a new random agent wallet
 * @param provider - Browser provider to connect wallet
 * @returns New agent wallet connected to provider
 */
async function createAgentSigner(provider: BrowserProvider): Promise<BaseWallet> {
  const generatedWallet = Wallet.createRandom();
  return generatedWallet.connect(provider);
}

/**
 * Get existing agent signer from storage
 * @param masterAddress - Master wallet address
 * @param provider - Browser provider to connect wallet
 * @returns Existing agent wallet or null if not found
 */
async function getAgentSigner(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<BaseWallet | null> {
  const privateKey = await getAgentPrivateKey(masterAddress);
  if (!privateKey) {
    return null;
  }

  try {
    return new Wallet(privateKey).connect(provider);
  } catch (error) {
    console.error('Failed to create wallet from stored private key:', error);
    return null;
  }
}

/**
 * Get existing agent signer or create new one if doesn't exist
 * @param masterAddress - Master wallet address
 * @param provider - Browser provider to connect wallet
 * @returns Agent wallet (existing or newly created)
 */
export async function getOrCreateAgentSigner(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<BaseWallet> {
  // Try to get existing signer
  const existingSigner = await getAgentSigner(masterAddress, provider);
  if (existingSigner) {
    return existingSigner;
  }

  // Create new signer and store it
  const newSigner = await createAgentSigner(provider);
  try {
    await setAgentPrivateKey(masterAddress, newSigner.privateKey);
  } catch (error) {
    console.error('Failed to persist generated agent signer:', error);
  }

  return newSigner;
}
