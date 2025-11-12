/**
 * BridgeService - Core business logic for bridge operations
 *
 * This service implements the BridgePort interface and coordinates
 * cross-chain bridging operations between Arbitrum L2 and Hyperliquid L1.
 *
 * Design principles:
 * - Pure business logic (no React dependencies, no UI)
 * - Uses WalletPort for wallet operations
 * - Uses HyperliquidGateway for Hyperliquid operations
 * - Uses Arbitrum adapters for L2 operations
 * - Updates bridgeStore for reactive UI
 * - Coordination Service: User-driven, not autonomous
 *
 * Data flow:
 * 1. User triggers deposit/withdraw action in UI
 * 2. UI calls BridgeService methods
 * 3. Service coordinates wallet + adapters
 * 4. Service updates store for UI reactivity
 */

import type { BridgePort } from '../ports/bridgePort';
import type { DepositResult, WithdrawalResult } from '../ports/types';
import type { WalletPort } from '../../wallet/ports/walletPort';
import type { HyperliquidGateway } from '../../../infra/hyperliquid/hyperliquidGateway';
import { bridgeStore } from '../adapters/bridgeStore';
import * as arbitrumAdapter from '../adapters/arbitrumAdapter';
import * as hyperliquidBridgeAdapter from '../adapters/hyperliquidBridgeAdapter';
import { ARBITRUM_CONFIG, BRIDGE_LIMITS } from '../config';

/**
 * BridgeService implementation
 *
 * Manages cross-chain bridging operations with business logic validation.
 */
export class BridgeService implements BridgePort {
  constructor(
    private readonly walletService: WalletPort,
    private readonly hyperliquidGateway: HyperliquidGateway,
  ) {}

  /**
   * Get USDC balance on Arbitrum
   */
  async getArbitrumBalance(): Promise<string | undefined> {
    try {
      const wallet = await this.walletService.active();
      if (!wallet) {
        return undefined;
      }

      const balance = await arbitrumAdapter.getArbitrumUsdcBalance(wallet);
      return balance;
    } catch (error) {
      console.error('[BridgeService] Failed to get Arbitrum balance:', error);
      return undefined;
    }
  }

  /**
   * Get withdrawable USDC balance on Hyperliquid
   */
  async getWithdrawableBalance(): Promise<string | undefined> {
    try {
      const wallet = await this.walletService.active();
      if (!wallet) {
        return undefined;
      }

      const balance = await hyperliquidBridgeAdapter.getWithdrawableBalance(
        this.hyperliquidGateway,
        wallet.address,
      );
      return balance;
    } catch (error) {
      console.error('[BridgeService] Failed to get withdrawable balance:', error);
      return undefined;
    }
  }

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   *
   * Business logic:
   * 1. Validates minimum deposit amount
   * 2. Validates wallet availability
   * 3. Executes transfer via bridge contract
   * 4. Refreshes balances after successful deposit
   */
  async deposit(amount: string): Promise<DepositResult> {
    // Business rule: Validate minimum deposit
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < BRIDGE_LIMITS.minimumDeposit) {
      throw new Error(`Minimum deposit amount is ${BRIDGE_LIMITS.minimumDeposit} USDC`);
    }

    // Get active wallet
    const wallet = await this.walletService.active();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    try {
      // Execute deposit based on wallet type
      let txHash: string;
      if (wallet.type === 'privy') {
        txHash = await arbitrumAdapter.depositUsdcWithPrivy(
          wallet,
          ARBITRUM_CONFIG.bridgeAddress,
          amount,
        );
      } else if (wallet.type === 'external') {
        txHash = await arbitrumAdapter.depositUsdcWithExternalWallet(
          wallet,
          ARBITRUM_CONFIG.bridgeAddress,
          amount,
        );
      } else {
        throw new Error('Unsupported wallet type');
      }

      // Refresh balances after successful deposit
      await this.refreshBalances();

      return {
        txHash,
        amount,
      };
    } catch (error) {
      console.error('[BridgeService] Deposit failed:', error);
      throw error;
    }
  }

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   *
   * Business logic:
   * 1. Validates minimum withdrawal amount
   * 2. Validates destination address format
   * 3. Validates wallet availability
   * 4. Executes withdrawal via Hyperliquid API
   * 5. Refreshes balances after successful withdrawal
   */
  async withdraw(destinationAddress: string, amount: string): Promise<WithdrawalResult> {
    // Business rule: Validate minimum withdrawal
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount < BRIDGE_LIMITS.minimumWithdrawal) {
      throw new Error(`Minimum withdrawal amount is ${BRIDGE_LIMITS.minimumWithdrawal} USDC`);
    }

    // Business rule: Validate destination address
    if (!destinationAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      throw new Error('Invalid Arbitrum address format');
    }

    // Get active wallet
    const wallet = await this.walletService.active();
    if (!wallet) {
      throw new Error('No active wallet');
    }

    try {
      // Get signer for signing withdrawal request
      const provider = await wallet.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }
      const signer = await provider.getSigner();

      // Execute withdrawal
      const success = await hyperliquidBridgeAdapter.executeWithdrawal(
        this.hyperliquidGateway,
        signer,
        destinationAddress,
        amount,
      );

      if (!success) {
        throw new Error('Withdrawal request was not successful');
      }

      // Refresh balances after successful withdrawal
      await this.refreshBalances();

      return {
        success: true,
        amount,
      };
    } catch (error) {
      console.error('[BridgeService] Withdrawal failed:', error);
      throw error;
    }
  }

  /**
   * Refresh balances on both chains
   *
   * Fetches current Arbitrum USDC balance and Hyperliquid withdrawable balance.
   * Updates the bridgeStore with the new values.
   */
  async refreshBalances(): Promise<void> {
    try {
      bridgeStore.getState().setLoadingBalances(true);
      bridgeStore.getState().setError(undefined);

      // Fetch both balances in parallel
      const [arbitrumBalance, withdrawableBalance] = await Promise.all([
        this.getArbitrumBalance(),
        this.getWithdrawableBalance(),
      ]);

      // Update store
      bridgeStore.getState().setArbitrumBalance(arbitrumBalance);
      bridgeStore.getState().setWithdrawableBalance(withdrawableBalance);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      bridgeStore.getState().setError(err);
      console.error('[BridgeService] Failed to refresh balances:', error);
    } finally {
      bridgeStore.getState().setLoadingBalances(false);
    }
  }
}
