import * as hl from '@nktkas/hyperliquid';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrowserProvider, Wallet } from 'ethers';
import { AGENT_STORAGE_PREFIX, DEFAULT_AGENT_NAME } from '../agent';

/**
 * Check if we have a local agent private key stored
 */
export async function hasLocalAgent(masterAddress: string): Promise<boolean> {
  const storageKey = `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;
  try {
    const storedPrivateKey = await AsyncStorage.getItem(storageKey);
    return !!storedPrivateKey;
  } catch (error) {
    console.error('Failed to check local agent:', error);
    return false;
  }
}

/**
 * Get the agent address from local storage
 */
export async function getLocalAgentAddress(
  masterAddress: string,
  provider: BrowserProvider,
): Promise<string | undefined> {
  const storageKey = `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;
  try {
    const storedPrivateKey = await AsyncStorage.getItem(storageKey);
    if (!storedPrivateKey) return undefined;

    const wallet = new Wallet(storedPrivateKey).connect(provider);
    return await wallet.getAddress();
  } catch (error) {
    console.error('Failed to get local agent address:', error);
    return undefined;
  }
}

/**
 * Check if the local agent is valid (matches blockchain)
 * Returns the agent validation status and address
 */
export async function validateLocalAgent(
  masterAddress: string,
  provider: BrowserProvider,
  infoClient: hl.InfoClient,
): Promise<{ isValid: boolean; localAddress?: string; blockchainAddress?: string }> {
  try {
    // Get local agent address
    const localAddress = await getLocalAgentAddress(masterAddress, provider);
    if (!localAddress) {
      return { isValid: false };
    }

    // Get blockchain agents
    const existingAgents = await infoClient.extraAgents({ user: masterAddress });
    const riverrunAgent = existingAgents.find(agent => agent.name === DEFAULT_AGENT_NAME);

    if (!riverrunAgent) {
      // Riverrun Agent doesn't exist on blockchain, but we have local key
      return { isValid: false, localAddress };
    }

    // Check if addresses match
    const isValid = riverrunAgent.address.toLowerCase() === localAddress.toLowerCase();

    return {
      isValid,
      localAddress,
      blockchainAddress: riverrunAgent.address,
    };
  } catch (error) {
    console.error('Failed to validate local agent:', error);
    return { isValid: false };
  }
}

/**
 * Check if Riverrun Agent exists on blockchain
 */
export async function checkRiverrunAgentExists(
  masterAddress: string,
  infoClient: hl.InfoClient,
): Promise<{ exists: boolean; address?: string }> {
  try {
    const existingAgents = await infoClient.extraAgents({ user: masterAddress });
    const riverrunAgent = existingAgents.find(agent => agent.name === DEFAULT_AGENT_NAME);

    return {
      exists: !!riverrunAgent,
      address: riverrunAgent?.address,
    };
  } catch (error) {
    console.error('Failed to check Riverrun Agent:', error);
    return { exists: false };
  }
}

/**
 * Count named agents for the user
 */
export async function countNamedAgents(
  masterAddress: string,
  infoClient: hl.InfoClient,
): Promise<number> {
  try {
    const existingAgents = await infoClient.extraAgents({ user: masterAddress });
    return existingAgents.filter(agent => agent.name).length;
  } catch (error) {
    console.error('Failed to count named agents:', error);
    return 0;
  }
}
