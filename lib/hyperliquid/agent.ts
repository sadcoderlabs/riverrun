import AsyncStorage from '@react-native-async-storage/async-storage';
import { BaseWallet, BrowserProvider, Wallet } from 'ethers';

export const AGENT_STORAGE_PREFIX = 'hl-agent:private-key:';
export const DEFAULT_AGENT_NAME = 'Riverrun Agent';

export async function getOrCreateAgentSigner(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<BaseWallet> {
  const storageKey = `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;

  try {
    const storedPrivateKey = await AsyncStorage.getItem(storageKey);
    if (storedPrivateKey) {
      return new Wallet(storedPrivateKey).connect(provider);
    }
  } catch (error) {
    console.error('Failed to load stored agent signer', error);
  }

  const generatedWallet = Wallet.createRandom();

  try {
    await AsyncStorage.setItem(storageKey, generatedWallet.privateKey);
  } catch (error) {
    console.error('Failed to persist generated agent signer', error);
  }

  return generatedWallet.connect(provider);
}

export async function clearAgentSigner(masterAddress: string): Promise<void> {
  const storageKey = `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;

  try {
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear stored agent signer', error);
    throw error;
  }
}
