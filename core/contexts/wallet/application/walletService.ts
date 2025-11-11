import type { Signer } from 'ethers';
import type { WalletPort } from '../ports/walletPort';
import type {
  WalletInfo,
  WalletSource,
  SignMessageInput,
  SignTxInput,
  TxResult,
  ActiveWallet,
} from '../ports/types';
import type { PrivyWalletAdapter } from '../adapters/privyWalletAdapter';
import type { ReownWalletAdapter } from '../adapters/reownWalletAdapter';
import { walletSelectionStore } from '../infrastructure/walletSelectionStore';

/**
 * WalletService - Core business logic for wallet operations
 *
 * This service implements the WalletPort interface and coordinates
 * between different wallet adapters (Privy and Reown).
 *
 * Design principles:
 * - Manages multiple wallet adapters
 * - Implements wallet selection logic (Privy priority by default)
 * - Provides intelligent fallback when disconnecting active wallet
 * - Uses vanilla Zustand store for state management (framework independent)
 */
export class WalletService implements WalletPort {
  private previousReownConnected = false;

  constructor(
    private privyAdapter: PrivyWalletAdapter,
    private reownAdapter: ReownWalletAdapter,
  ) {}

  /**
   * Handle connection state changes (should be called when adapters change)
   *
   * Business rule: When Reown wallet connects, automatically switch to it.
   * This provides better UX as users expect to use the wallet they just connected.
   */
  handleConnectionStateChange(): void {
    const isReownConnected = this.reownAdapter.isAvailable();

    // Check if Reown just connected (transition from false to true)
    if (!this.previousReownConnected && isReownConnected) {
      // Auto-switch to the newly connected Reown wallet
      walletSelectionStore.getState().setSelectedWalletSource('reown');
    }

    // Update the previous state
    this.previousReownConnected = isReownConnected;
  }

  /**
   * List all available (connected) wallets
   */
  async listAvailable(): Promise<WalletInfo[]> {
    const wallets: WalletInfo[] = [];

    const privyInfo = await this.privyAdapter.getInfo();
    if (privyInfo) {
      wallets.push(privyInfo);
    }

    const reownInfo = await this.reownAdapter.getInfo();
    if (reownInfo) {
      wallets.push(reownInfo);
    }

    return wallets;
  }

  /**
   * Get the currently active wallet
   *
   * Selection logic:
   * 1. If user has explicitly selected a wallet, use that
   * 2. If no selection, use default priority (Privy > Reown)
   * 3. Ensure the selected wallet is actually connected
   * 4. Fallback to the other wallet if selected one is not available
   */
  async active(): Promise<ActiveWallet | undefined> {
    let activeSource = walletSelectionStore.getState().selectedWalletSource;

    const privyAvailable = this.privyAdapter.isAvailable();
    const reownAvailable = this.reownAdapter.isAvailable();

    // If no explicit selection, use default priority (Privy > Reown)
    if (!activeSource) {
      if (privyAvailable) {
        activeSource = 'privy';
      } else if (reownAvailable) {
        activeSource = 'reown';
      }
    }

    // Ensure the selected wallet is actually connected
    if (activeSource === 'privy' && !privyAvailable) {
      // Privy wallet is selected but not connected, fallback to Reown if available
      activeSource = reownAvailable ? 'reown' : undefined;
    }
    if (activeSource === 'reown' && !reownAvailable) {
      // Reown wallet is selected but not connected, fallback to Privy if available
      activeSource = privyAvailable ? 'privy' : undefined;
    }

    if (!activeSource) {
      return undefined;
    }

    // Get the active wallet from the appropriate adapter
    if (activeSource === 'privy') {
      return this.privyAdapter.getActiveWallet();
    } else {
      return this.reownAdapter.getActiveWallet();
    }
  }

  /**
   * Connect to a wallet
   */
  async connect(source: WalletSource): Promise<void> {
    if (source === 'privy') {
      await this.privyAdapter.connect();
      // Auto-switch to Privy wallet after successful connection
      walletSelectionStore.getState().setSelectedWalletSource('privy');
    } else if (source === 'reown') {
      await this.reownAdapter.connect();
      // Note: Auto-switch will happen via handleConnectionStateChange
    }
  }

  /**
   * Disconnect from a wallet
   *
   * Intelligently switches to another available wallet if disconnecting
   * the currently active wallet.
   */
  async disconnect(source: WalletSource): Promise<void> {
    const { selectedWalletSource, setSelectedWalletSource, clearSelection } =
      walletSelectionStore.getState();
    const needsSwitch = selectedWalletSource === source;

    let targetWallet: WalletSource | undefined;

    if (needsSwitch) {
      // Find other available wallet to switch to
      if (source === 'privy' && this.reownAdapter.isAvailable()) {
        targetWallet = 'reown';
      } else if (source === 'reown' && this.privyAdapter.isAvailable()) {
        targetWallet = 'privy';
      }

      // Switch before disconnecting to ensure smooth transition
      if (targetWallet) {
        setSelectedWalletSource(targetWallet);
      } else {
        // No other wallet available, will revert to login screen
        clearSelection();
      }
    }

    // Perform the disconnect
    if (source === 'privy') {
      await this.privyAdapter.disconnect();
    } else if (source === 'reown') {
      await this.reownAdapter.disconnect();
    }
  }

  /**
   * Set the active wallet (switch between connected wallets)
   */
  async setActive(source: WalletSource): Promise<void> {
    // Verify the wallet is actually available before switching
    if (source === 'privy' && !this.privyAdapter.isAvailable()) {
      throw new Error('Privy wallet is not connected');
    }
    if (source === 'reown' && !this.reownAdapter.isAvailable()) {
      throw new Error('Reown wallet is not connected');
    }

    walletSelectionStore.getState().setSelectedWalletSource(source);
  }

  /**
   * Sign a message with the active wallet
   */
  async signMessage(input: SignMessageInput): Promise<`0x${string}`> {
    const activeWallet = await this.active();
    if (!activeWallet) {
      throw new Error('No active wallet');
    }

    if (activeWallet.source === 'privy') {
      return this.privyAdapter.signMessage(input.message);
    } else {
      return this.reownAdapter.signMessage(input.message);
    }
  }

  /**
   * Sign and send a transaction with the active wallet
   */
  async signAndSendTx(input: SignTxInput): Promise<TxResult> {
    const activeWallet = await this.active();
    if (!activeWallet) {
      throw new Error('No active wallet');
    }

    if (activeWallet.source === 'privy') {
      return this.privyAdapter.signAndSendTx(input);
    } else {
      return this.reownAdapter.signAndSendTx(input);
    }
  }

  /**
   * Get an ethers.js Signer for the active wallet
   *
   * This is exposed for integration with third-party libraries
   * like Hyperliquid SDK that require a Signer instance.
   */
  async getSigner(): Promise<Signer> {
    const activeWallet = await this.active();
    if (!activeWallet) {
      throw new Error('No active wallet');
    }

    if (activeWallet.source === 'privy') {
      return this.privyAdapter.getSigner();
    } else {
      return this.reownAdapter.getSigner();
    }
  }
}
