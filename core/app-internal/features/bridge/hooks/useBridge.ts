/**
 * useBridge - React Hook for Bridge Operations
 *
 * This hook provides bridge operations with UI integration (loading states, etc.).
 * For state access, use useBridgeStore instead for better performance.
 */

import { useCallback, useState } from 'react';
import { useContainer } from '@/core/app-internal/di';
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
 * Hook for managing bridge operations with UI integration
 *
 * IMPORTANT: This hook does NOT auto-load data. Call refreshBalances() to initialize.
 *
 * @example
 * ```tsx
 * import { useBridgeStore, useBridge } from '@/core/app-internal/di';
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
  const bridgeService = useContainer(c => c.bridgeService);

  // UI state management (presentation layer only)
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  /**
   * Refresh balances on both chains
   */
  const refreshBalances = useCallback(async (): Promise<void> => {
    try {
      await bridgeService.refreshBalances();
    } catch (error) {
      console.error('[useBridge] Failed to refresh balances:', error);
    }
  }, [bridgeService]);

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   */
  const deposit = useCallback(
    async (amount: string): Promise<DepositResult> => {
      try {
        setIsDepositing(true);
        return await bridgeService.deposit(amount);
      } catch (error) {
        console.error('[useBridge] Deposit failed:', error);
        throw error;
      } finally {
        setIsDepositing(false);
      }
    },
    [bridgeService],
  );

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   */
  const withdraw = useCallback(
    async (destinationAddress: string, amount: string): Promise<WithdrawalResult> => {
      try {
        setIsWithdrawing(true);
        return await bridgeService.withdraw(destinationAddress, amount);
      } catch (error) {
        console.error('[useBridge] Withdrawal failed:', error);
        throw error;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [bridgeService],
  );

  return {
    isDepositing,
    isWithdrawing,
    refreshBalances,
    deposit,
    withdraw,
  };
}
