/**
 * AgentStoragePort - Out Port for private key storage
 *
 * This port defines the interface for agent private key persistence.
 * Implementation: AgentPkStore (adapter wrapping SecureStore)
 */

/**
 * Port for agent private key storage operations
 */
export interface AgentStoragePort {
  /**
   * Get agent private key from storage
   * @param masterAddress - Master wallet address
   * @returns Private key string or undefined if not found
   */
  getPrivateKey(masterAddress: string): Promise<string | undefined>;

  /**
   * Save agent private key to storage
   * @param masterAddress - Master wallet address
   * @param privateKey - Private key to store
   */
  setPrivateKey(masterAddress: string, privateKey: string): Promise<void>;

  /**
   * Remove agent private key from storage
   * @param masterAddress - Master wallet address
   */
  clearPrivateKey(masterAddress: string): Promise<void>;

  /**
   * Check if agent private key exists in storage
   * @param masterAddress - Master wallet address
   * @returns True if private key exists
   */
  hasPrivateKey(masterAddress: string): Promise<boolean>;
}
