import { BrowserProvider, Signer } from 'ethers';
import type { WalletInfo, WalletSource, SignTxInput, TxResult, ActiveWallet } from '../ports/types';

/**
 * Reown hooks data structure
 *
 * This represents the data we get from Reown/AppKit React hooks
 * (useAccount, useWalletInfo, useProvider, useAppKit)
 */
export interface ReownHooksData {
  // Account state
  address: string | undefined;
  isConnected: boolean;

  // Wallet info
  walletInfo:
    | {
        name?: string;
      }
    | undefined;

  // Provider
  provider: any | undefined; // EIP-1193 provider

  // Operations
  openModal: () => void;
  disconnect: () => void;
}

/**
 * ReownWalletAdapter - Adapter for Reown/AppKit external wallets
 *
 * This adapter wraps the Reown AppKit SDK and provides a clean interface
 * that conforms to the WalletPort contract.
 *
 * Note: This adapter receives data from React hooks (via constructor)
 * rather than calling hooks directly, since hooks can only be called
 * from React components.
 */
export class ReownWalletAdapter {
  constructor(private hooksData: ReownHooksData) {}

  /**
   * Check if Reown wallet is available and connected
   */
  isAvailable(): boolean {
    return this.hooksData.isConnected && !!this.hooksData.address;
  }

  /**
   * Get wallet information
   */
  async getInfo(): Promise<WalletInfo | undefined> {
    if (!this.hooksData.isConnected || !this.hooksData.address) {
      return undefined;
    }

    return {
      source: 'reown' as WalletSource,
      address: this.hooksData.address,
      name: this.hooksData.walletInfo?.name || 'External Wallet',
      type: 'external',
      isConnected: true,
    };
  }

  /**
   * Get active wallet with operations
   */
  async getActiveWallet(): Promise<ActiveWallet | undefined> {
    if (!this.hooksData.isConnected || !this.hooksData.address || !this.hooksData.provider) {
      return undefined;
    }

    const address = this.hooksData.address;
    const provider = this.hooksData.provider;

    return {
      address,
      name: this.hooksData.walletInfo?.name || 'External Wallet',
      type: 'external',
      source: 'reown',
      getProvider: async () => {
        return new BrowserProvider(provider);
      },
      switchChain: async (chainId: number) => {
        if (!provider.request) {
          throw new Error('Provider does not support network switching');
        }

        const chainIdHex = `0x${chainId.toString(16)}`;
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      },
    };
  }

  /**
   * Connect via Reown (opens wallet connection modal)
   */
  async connect(): Promise<void> {
    this.hooksData.openModal();
    // Note: The actual connection is async and handled by the modal
    // The connection state will be updated via hooks
  }

  /**
   * Disconnect from Reown wallet
   */
  async disconnect(): Promise<void> {
    this.hooksData.disconnect();
  }

  /**
   * Get ethers.js BrowserProvider
   */
  async getProvider(): Promise<BrowserProvider> {
    if (!this.hooksData.provider) {
      throw new Error('Reown wallet not connected');
    }

    return new BrowserProvider(this.hooksData.provider);
  }

  /**
   * Get ethers.js Signer
   */
  async getSigner(): Promise<Signer> {
    const provider = await this.getProvider();
    return provider.getSigner();
  }

  /**
   * Sign a message
   */
  async signMessage(message: string): Promise<`0x${string}`> {
    const signer = await this.getSigner();
    const signature = await signer.signMessage(message);
    return signature as `0x${string}`;
  }

  /**
   * Sign and send a transaction
   */
  async signAndSendTx(input: SignTxInput): Promise<TxResult> {
    const signer = await this.getSigner();

    const tx = {
      to: input.to,
      value: input.value,
      data: input.data,
      ...(input.chainId && { chainId: input.chainId }),
    };

    const txResponse = await signer.sendTransaction(tx);
    const receipt = await txResponse.wait();

    if (!receipt?.hash) {
      throw new Error('Transaction failed - no hash returned');
    }

    return {
      txHash: receipt.hash as `0x${string}`,
    };
  }

  /**
   * Switch blockchain network
   */
  async switchChain(chainId: number): Promise<void> {
    if (!this.hooksData.provider?.request) {
      throw new Error('Reown wallet not connected or does not support network switching');
    }

    const chainIdHex = `0x${chainId.toString(16)}`;
    await this.hooksData.provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  }
}
