import { BrowserProvider, Signer } from 'ethers';
import type { WalletInfo, WalletSource, SignTxInput, TxResult, ActiveWallet } from '../ports/types';

/**
 * Privy hooks data structure
 *
 * This represents the data we get from Privy React hooks
 * (usePrivy, useEmbeddedEthereumWallet, useLogin)
 */
export interface PrivyHooksData {
  // Wallet state
  embeddedWallet:
    | {
        address: string;
        getProvider: () => Promise<any>; // EIP-1193 provider
      }
    | undefined;

  // User state
  user: any | undefined;

  // Operations
  login: (options: any) => Promise<unknown>;
  logout: () => Promise<void>;
}

/**
 * PrivyWalletAdapter - Adapter for Privy embedded wallet
 *
 * This adapter wraps the Privy SDK and provides a clean interface
 * that conforms to the WalletPort contract.
 *
 * Note: This adapter receives data from React hooks (via constructor)
 * rather than calling hooks directly, since hooks can only be called
 * from React components.
 */
export class PrivyWalletAdapter {
  constructor(private hooksData: PrivyHooksData) {}

  /**
   * Check if Privy wallet is available and connected
   */
  isAvailable(): boolean {
    return !!this.hooksData.embeddedWallet?.address;
  }

  /**
   * Get wallet information
   */
  async getInfo(): Promise<WalletInfo | undefined> {
    const wallet = this.hooksData.embeddedWallet;
    if (!wallet) {
      return undefined;
    }

    return {
      source: 'privy' as WalletSource,
      address: wallet.address,
      name: 'Privy Wallet',
      type: 'privy',
      isConnected: true,
    };
  }

  /**
   * Get active wallet with operations
   */
  async getActiveWallet(): Promise<ActiveWallet | undefined> {
    const wallet = this.hooksData.embeddedWallet;
    if (!wallet) {
      return undefined;
    }

    return {
      address: wallet.address,
      name: 'Privy Wallet',
      type: 'privy',
      source: 'privy',
      getProvider: async () => {
        const eip1193Provider = await wallet.getProvider();
        return new BrowserProvider(eip1193Provider);
      },
      switchChain: async (chainId: number) => {
        const provider = await wallet.getProvider();
        const chainIdHex = `0x${chainId.toString(16)}`;
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: chainIdHex }],
        });
      },
    };
  }

  /**
   * Connect via Privy (email login)
   */
  async connect(): Promise<void> {
    try {
      await this.hooksData.login({ loginMethods: ['email'] });
    } catch (error: any) {
      // Check if user cancelled the modal
      const errorMessage = error?.message || error?.toString() || '';
      const isCancelled =
        errorMessage.includes('cancelled') ||
        errorMessage.includes('dismissed') ||
        errorMessage.includes('closed') ||
        errorMessage.includes('User cancelled') ||
        error?.code === 'USER_CANCELLED';

      // Re-throw if it's not a cancellation
      if (!isCancelled) {
        throw error;
      }
    }
  }

  /**
   * Disconnect from Privy wallet
   */
  async disconnect(): Promise<void> {
    if (this.hooksData.user) {
      await this.hooksData.logout();
    }
  }

  /**
   * Get ethers.js BrowserProvider
   */
  async getProvider(): Promise<BrowserProvider> {
    const wallet = this.hooksData.embeddedWallet;
    if (!wallet) {
      throw new Error('Privy wallet not connected');
    }

    const eip1193Provider = await wallet.getProvider();
    return new BrowserProvider(eip1193Provider);
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
    const provider = await this.getProvider();

    // For Privy embedded wallet in React Native, we need to use eth_signTransaction
    const txToSign = {
      to: input.to,
      value: input.value || '0x0',
      data: input.data || '0x',
      ...(input.chainId && { chainId: `0x${input.chainId.toString(16)}` }),
    };

    const signedTx = await provider.send('eth_signTransaction', [txToSign]);
    const txResponse = await provider.broadcastTransaction(signedTx);
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
    const wallet = this.hooksData.embeddedWallet;
    if (!wallet) {
      throw new Error('Privy wallet not connected');
    }

    const provider = await wallet.getProvider();
    const chainIdHex = `0x${chainId.toString(16)}`;

    await provider.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: chainIdHex }],
    });
  }
}
