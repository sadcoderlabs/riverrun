/**
 * Storage layer for agent private keys
 * Handles all AsyncStorage operations related to agent management
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AGENT_STORAGE_PREFIX } from './constants';

/**
 * Generate storage key for a master address
 */
function getStorageKey(masterAddress: string): string {
  return `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;
}

/**
 * Get agent private key from storage
 * @param masterAddress - Master wallet address
 * @returns Private key string or null if not found
 */
export async function getAgentPrivateKey(masterAddress: string): Promise<string | null> {
  try {
    const storageKey = getStorageKey(masterAddress);
    const privateKey = await AsyncStorage.getItem(storageKey);
    return privateKey;
  } catch (error) {
    console.error('Failed to get agent private key from storage:', error);
    return null;
  }
}

/**
 * Save agent private key to storage
 * @param masterAddress - Master wallet address
 * @param privateKey - Private key to store
 */
export async function setAgentPrivateKey(masterAddress: string, privateKey: string): Promise<void> {
  try {
    const storageKey = getStorageKey(masterAddress);
    await AsyncStorage.setItem(storageKey, privateKey);
  } catch (error) {
    console.error('Failed to save agent private key to storage:', error);
    throw error;
  }
}

/**
 * Remove agent private key from storage
 * @param masterAddress - Master wallet address
 */
export async function clearAgentPrivateKey(masterAddress: string): Promise<void> {
  try {
    const storageKey = getStorageKey(masterAddress);
    await AsyncStorage.removeItem(storageKey);
  } catch (error) {
    console.error('Failed to clear agent private key from storage:', error);
    throw error;
  }
}

/**
 * Check if agent private key exists in storage
 * @param masterAddress - Master wallet address
 * @returns True if private key exists
 */
export async function hasAgentPrivateKey(masterAddress: string): Promise<boolean> {
  try {
    const privateKey = await getAgentPrivateKey(masterAddress);
    return !!privateKey;
  } catch (error) {
    console.error('Failed to check agent private key in storage:', error);
    return false;
  }
}
