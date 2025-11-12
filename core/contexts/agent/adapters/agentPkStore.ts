/**
 * Agent Private Key Storage Adapter
 * Wraps SecureStore for agent private key persistence
 *
 * This is a stateless adapter - all methods require masterAddress parameter.
 */

import * as SecureStore from 'expo-secure-store';

/** Storage key prefix for agent private keys in SecureStore */
const AGENT_STORAGE_PREFIX = 'riverrun-agent-pk-';

/**
 * Agent Private Key Store (Stateless)
 * Manages persistence of agent private keys in SecureStore
 */
export class AgentPkStore {
  /**
   * Generate storage key for the master address
   */
  private getStorageKey(masterAddress: string): string {
    return `${AGENT_STORAGE_PREFIX}${masterAddress.toLowerCase()}`;
  }

  /**
   * Get agent private key from storage
   * @param masterAddress - Master wallet address
   * @returns Private key string or undefined if not found
   */
  async getPrivateKey(masterAddress: string): Promise<string | undefined> {
    try {
      const storageKey = this.getStorageKey(masterAddress);
      const privateKey = await SecureStore.getItemAsync(storageKey);
      return privateKey ?? undefined;
    } catch (error) {
      console.error('Failed to get agent private key from storage:', error);
      return undefined;
    }
  }

  /**
   * Save agent private key to storage
   * @param masterAddress - Master wallet address
   * @param privateKey - Private key to store
   */
  async setPrivateKey(masterAddress: string, privateKey: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(masterAddress);
      await SecureStore.setItemAsync(storageKey, privateKey);
    } catch (error) {
      console.error('Failed to save agent private key to storage:', error);
      throw error;
    }
  }

  /**
   * Remove agent private key from storage
   * @param masterAddress - Master wallet address
   */
  async clearPrivateKey(masterAddress: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey(masterAddress);
      await SecureStore.deleteItemAsync(storageKey);
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
  async hasPrivateKey(masterAddress: string): Promise<boolean> {
    try {
      const privateKey = await this.getPrivateKey(masterAddress);
      return !!privateKey;
    } catch (error) {
      console.error('Failed to check agent private key in storage:', error);
      return false;
    }
  }
}
