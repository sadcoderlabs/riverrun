/**
 * useBridge - React Hook for Bridge Operations (UseCase Pattern)
 *
 * This hook provides bridge operations with UI integration (loading states, etc.).
 * For state access, use useBridgeStore instead for better performance.
 *
 * Responsibilities:
 * - Get wallet and signer from WalletContext
 * - Build commands for UseCases
 * - Execute UseCases
 * - Compose UseCases (e.g., refreshBalances = getArbitrumBalance + getWithdrawableBalance)
 * - Update bridgeStore with results
 * - Manage UI loading states
 * - Handle errors
 *
 * Does NOT contain:
 * - Business logic (in UseCases)
 * - Infrastructure logic (in Ports/Adapters)
 */

import { useCallback, useState } from 'react';
import { useContainer, useWalletContext } from '@/app-internal';
import { bridgeStore } from '../../../../contexts/bridge/adapters/bridgeStore';
import type { DepositResult, WithdrawalResult } from '../../../../contexts/bridge/ports/types';

/**
 * Result type for useBridge hook
 */
export interface UseBridgeResult {
  /** Whether deposit operation is in progress (UI state only) */
  isDepositing: boolean;
  /** Whether withdrawal operation is in progress (UI state only) */
  isWithdrawing: boolean;
  /**
   * Refresh balances on both chains
   *
   * Composes GetArbitrumBalanceUseCase and GetWithdrawableBalanceUseCase.
   * Updates the bridgeStore with current Arbitrum and Hyperliquid balances.
   *
   * @returns Promise that resolves when balances are refreshed
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   refreshBalances();
   * }, [refreshBalances]);
   * ```
   */
  refreshBalances: () => Promise<void>;
  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   *
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Deposit result with transaction hash and amount
   * @throws Error if deposit fails
   */
  deposit: (amount: string) => Promise<DepositResult>;
  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   *
   * @param destinationAddress - Arbitrum address to receive USDC
   * @param amount - Amount in USDC (human-readable, e.g., "10.5")
   * @returns Withdrawal result with success flag and amount
   * @throws Error if withdrawal fails
   */
  withdraw: (destinationAddress: string, amount: string) => Promise<WithdrawalResult>;
}

/**
 * Hook for managing bridge operations with UI integration (UseCase Pattern)
 *
 * IMPORTANT: This hook does NOT auto-load data. Call refreshBalances() to initialize.
 *
 * @example
 * ```tsx
 * import { useBridgeStore, useBridge } from '@/app-internal/di';
 *
 * // State access - precise subscriptions
 * const arbitrumBalance = useBridgeStore(state => state.arbitrumBalance);
 * const withdrawableBalance = useBridgeStore(state => state.withdrawableBalance);
 *
 * // Business operations
 * const { deposit, withdraw, refreshBalances, isDepositing, isWithdrawing } = useBridge();
 *
 * // Refresh balances on mount
 * useEffect(() => {
 *   refreshBalances();
 * }, [refreshBalances]);
 *
 * // Deposit example
 * const handleDeposit = async () => {
 *   try {
 *     const result = await deposit("10.5");
 *     console.log('Deposit successful:', result.txHash);
 *   } catch (error) {
 *     console.error('Deposit failed:', error);
 *   }
 * };
 * ```
 */
export function useBridge(): UseBridgeResult {
  // Get UseCases from DI container
  const getArbitrumBalanceUseCase = useContainer(c => c.getArbitrumBalanceUseCase);
  const getWithdrawableBalanceUseCase = useContainer(c => c.getWithdrawableBalanceUseCase);
  const depositUsdcUseCase = useContainer(c => c.depositUsdcUseCase);
  const withdrawUsdcUseCase = useContainer(c => c.withdrawUsdcUseCase);

  // Get wallet from React Context
  const { wallet, getSigner } = useWalletContext();

  // UI state management (presentation layer only)
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  /**
   * Refresh balances on both chains
   *
   * UI Layer composition: Orchestrates two Query UseCases in parallel.
   */
  const refreshBalances = useCallback(async (): Promise<void> => {
    try {
      // UI Layer: Update loading state
      bridgeStore.getState().setLoadingBalances(true);
      bridgeStore.getState().setError(undefined);

      if (!wallet) {
        // No wallet - clear balances
        bridgeStore.getState().setArbitrumBalance(undefined);
        bridgeStore.getState().setWithdrawableBalance(undefined);
        return;
      }

      // UI Layer: Compose two Query UseCases
      // Execute both queries in parallel for better performance
      const [arbitrumBalance, withdrawableBalance] = await Promise.all([
        getArbitrumBalanceUseCase.execute({ walletAddress: wallet.address }),
        getWithdrawableBalanceUseCase.execute({ walletAddress: wallet.address }),
      ]);

      // UI Layer: Update store with results
      bridgeStore.getState().setArbitrumBalance(arbitrumBalance);
      bridgeStore.getState().setWithdrawableBalance(withdrawableBalance);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      bridgeStore.getState().setError(err);
      console.error('[useBridge] Failed to refresh balances:', error);
    } finally {
      bridgeStore.getState().setLoadingBalances(false);
    }
  }, [getArbitrumBalanceUseCase, getWithdrawableBalanceUseCase, wallet]);

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   */
  const deposit = useCallback(
    async (amount: string): Promise<DepositResult> => {
      if (!wallet) {
        throw new Error('No active wallet');
      }

      try {
        // UI Layer: Manage loading state
        setIsDepositing(true);

        // UI Layer: Build command
        const command = {
          wallet,
          amount,
        };

        // Execute UseCase
        const result = await depositUsdcUseCase.execute(command);

        // UI Layer: Refresh balances after successful deposit
        await refreshBalances();

        return result;
      } catch (error) {
        console.error('[useBridge] Deposit failed:', error);
        throw error;
      } finally {
        setIsDepositing(false);
      }
    },
    [depositUsdcUseCase, wallet, refreshBalances],
  );

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   */
  const withdraw = useCallback(
    async (destinationAddress: string, amount: string): Promise<WithdrawalResult> => {
      if (!wallet) {
        throw new Error('No active wallet');
      }

      try {
        // UI Layer: Manage loading state
        setIsWithdrawing(true);

        // UI Layer: Get signer
        const signer = await getSigner();

        // UI Layer: Build command
        const command = {
          signer,
          destinationAddress,
          amount,
        };

        // Execute UseCase
        const result = await withdrawUsdcUseCase.execute(command);

        // UI Layer: Refresh balances after successful withdrawal
        await refreshBalances();

        return result;
      } catch (error) {
        console.error('[useBridge] Withdrawal failed:', error);
        throw error;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [withdrawUsdcUseCase, wallet, getSigner, refreshBalances],
  );

  return {
    isDepositing,
    isWithdrawing,
    refreshBalances,
    deposit,
    withdraw,
  };
}
