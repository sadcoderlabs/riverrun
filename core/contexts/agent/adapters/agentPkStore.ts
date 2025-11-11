/**
 * Agent Private Key Storage Adapter
 * Wraps SecureStore for agent private key persistence
 */

import * as SecureStore from 'expo-secure-store';

/** Storage key prefix for agent private keys in SecureStore */
const AGENT_STORAGE_PREFIX = 'riverrun-agent-pk-';

/**
 * Agent Private Key Store
 * Manages persistence of agent private keys in SecureStore
 */
export class AgentPkStore {
  constructor(private readonly masterAddress: string) {}

  /**
   * Generate storage key for the master address
   */
  private getStorageKey(): string {
    return `${AGENT_STORAGE_PREFIX}${this.masterAddress.toLowerCase()}`;
  }

  /**
   * Get agent private key from storage
   * @returns Private key string or undefined if not found
   */
  async getPrivateKey(): Promise<string | undefined> {
    try {
      const storageKey = this.getStorageKey();
      const privateKey = await SecureStore.getItemAsync(storageKey);
      return privateKey ?? undefined;
    } catch (error) {
      console.error('Failed to get agent private key from storage:', error);
      return undefined;
    }
  }

  /**
   * Save agent private key to storage
   * @param privateKey - Private key to store
   */
  async setPrivateKey(privateKey: string): Promise<void> {
    try {
      const storageKey = this.getStorageKey();
      await SecureStore.setItemAsync(storageKey, privateKey);
    } catch (error) {
      console.error('Failed to save agent private key to storage:', error);
      throw error;
    }
  }

  /**
   * Remove agent private key from storage
   */
  async clearPrivateKey(): Promise<void> {
    try {
      const storageKey = this.getStorageKey();
      await SecureStore.deleteItemAsync(storageKey);
    } catch (error) {
      console.error('Failed to clear agent private key from storage:', error);
      throw error;
    }
  }

  /**
   * Check if agent private key exists in storage
   * @returns True if private key exists
   */
  async hasPrivateKey(): Promise<boolean> {
    try {
      const privateKey = await this.getPrivateKey();
      return !!privateKey;
    } catch (error) {
      console.error('Failed to check agent private key in storage:', error);
      return false;
    }
  }
}
