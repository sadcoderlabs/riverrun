import type { Signer } from 'ethers';
import type { WalletInfo, WalletSource, ActiveWallet } from './types';

/**
 * WalletPort - Core wallet interface for hexagonal architecture
 *
 * This port defines the contract for wallet operations, abstracting away
 * the implementation details of different wallet providers (Privy, Reown, etc.)
 *
 * Design principles:
 * - Keep it simple and focused on wallet operations
 * - Expose Provider/Signer for third-party SDK integration (e.g., Hyperliquid)
 * - Independent of React or any UI framework
 * - Easy to test and mock
 */
export interface WalletPort {
  /**
   * List all available wallets
   *
   * @returns Array of available wallet information
   */
  listAvailable(): Promise<WalletInfo[]>;

  /**
   * Get the currently active wallet
   *
   * @returns Active wallet information or undefined if no wallet is active
   */
  active(): Promise<ActiveWallet | undefined>;

  /**
   * Connect to a wallet
   *
   * @param source - The wallet source to connect
   */
  connect(source: WalletSource): Promise<void>;

  /**
   * Disconnect from a wallet
   *
   * @param source - The wallet source to disconnect
   */
  disconnect(source: WalletSource): Promise<void>;

  /**
   * Set the active wallet (switch between connected wallets)
   *
   * @param source - The wallet source to set as active
   */
  setActive(source: WalletSource): Promise<void>;

  /**
   * Get an ethers.js Signer for the active wallet
   *
   * This is exposed for integration with third-party libraries that require
   * a Signer instance (e.g., Hyperliquid SDK, ethers contracts)
   *
   * @returns Ethers Signer instance
   * @throws Error if no wallet is active
   */
  getSigner(): Promise<Signer>;
}
