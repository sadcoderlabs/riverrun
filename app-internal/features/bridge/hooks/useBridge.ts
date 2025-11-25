/**
 * useBridge - React Hook for Bridge Operations (UseCase Pattern)
 *
 * This hook provides bridge operations with UI integration (loading states, etc.).
 *
 * Responsibilities:
 * - Get wallet and signer from WalletContext
 * - Build commands for UseCases
 * - Execute UseCases
 * - Compose UseCases (e.g., refreshBalances = getArbitrumBalance + getWithdrawableBalance)
 * - Manage state with useState (local state, single responsibility)
 * - Manage UI loading states
 * - Handle errors
 * - Track telemetry events for deposit/withdraw operations
 *
 * Does NOT contain:
 * - Business logic (in UseCases)
 * - Infrastructure logic (in Ports/Adapters)
 *
 * State Management:
 * - Uses useState (not Zustand) - follows BuilderFee/Referral pattern
 * - Single hook provides both state and operations
 * - 2 使用端: deposit/withdraw 頁面 (各自獨立，無需共享狀態)
 */

import { useCallback, useState } from 'react';
import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import type { DepositResult, WithdrawalResult } from '../../../../contexts/bridge/ports/types';

/**
 * Result type for useBridge hook
 */
export interface UseBridgeResult {
  /** USDC balance on Arbitrum */
  arbitrumBalance: string | undefined;
  /** ETH balance on Arbitrum */
  arbitrumEthBalance: string | undefined;
  /** Withdrawable USDC balance on Hyperliquid */
  withdrawableBalance: string | undefined;
  /** Loading state for balance fetching */
  isLoadingBalances: boolean;
  /** Error state */
  error: Error | undefined;
  /** Whether deposit operation is in progress (UI state only) */
  isDepositing: boolean;
  /** Whether withdrawal operation is in progress (UI state only) */
  isWithdrawing: boolean;
  /**
   * Refresh balances on both chains
   *
   * Composes GetArbitrumBalanceUseCase, GetArbitrumEthBalanceUseCase, and GetWithdrawableBalanceUseCase.
   * Updates local state with current Arbitrum (USDC/ETH) and Hyperliquid balances.
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
 * import { useBridge } from '@/app-internal';
 *
 * // Single hook provides both state and operations
 * const {
 *   arbitrumBalance,
 *   arbitrumEthBalance,
 *   withdrawableBalance,
 *   isLoadingBalances,
 *   error,
 *   deposit,
 *   withdraw,
 *   refreshBalances,
 *   isDepositing,
 *   isWithdrawing
 * } = useBridge();
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
  const getArbitrumEthBalanceUseCase = useContainer(c => c.getArbitrumEthBalanceUseCase);
  const getWithdrawableBalanceUseCase = useContainer(c => c.getWithdrawableBalanceUseCase);
  const depositUsdcUseCase = useContainer(c => c.depositUsdcUseCase);
  const withdrawUsdcUseCase = useContainer(c => c.withdrawUsdcUseCase);
  const telemetryService = useContainer(c => c.telemetryService);

  // Get wallet from React Context
  const { wallet, getSigner } = useWallet();

  // State management - useState (not Zustand)
  // Follows BuilderFee/Referral pattern for consistency
  const [arbitrumBalance, setArbitrumBalance] = useState<string | undefined>(undefined);
  const [arbitrumEthBalance, setArbitrumEthBalance] = useState<string | undefined>(undefined);
  const [withdrawableBalance, setWithdrawableBalance] = useState<string | undefined>(undefined);
  const [isLoadingBalances, setIsLoadingBalances] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  // UI state management (presentation layer only)
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  /**
   * Refresh balances on both chains
   *
   * UI Layer composition: Orchestrates three Query UseCases in parallel.
   */
  const refreshBalances = useCallback(async (): Promise<void> => {
    try {
      // UI Layer: Update loading state
      setIsLoadingBalances(true);
      setError(undefined);

      if (!wallet) {
        // No wallet - clear balances
        setArbitrumBalance(undefined);
        setArbitrumEthBalance(undefined);
        setWithdrawableBalance(undefined);
        return;
      }

      // UI Layer: Compose three Query UseCases
      // Execute all queries in parallel for better performance
      const [arbitrumBal, arbitrumEthBal, withdrawableBal] = await Promise.all([
        getArbitrumBalanceUseCase.execute({ walletAddress: wallet.address }),
        getArbitrumEthBalanceUseCase.execute({ walletAddress: wallet.address }),
        getWithdrawableBalanceUseCase.execute({ walletAddress: wallet.address }),
      ]);

      // UI Layer: Update state with results
      setArbitrumBalance(arbitrumBal);
      setArbitrumEthBalance(arbitrumEthBal);
      setWithdrawableBalance(withdrawableBal);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      console.error('[useBridge] Failed to refresh balances:', err);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [
    getArbitrumBalanceUseCase,
    getArbitrumEthBalanceUseCase,
    getWithdrawableBalanceUseCase,
    wallet,
  ]);

  /**
   * Deposit USDC from Arbitrum to Hyperliquid
   */
  const deposit = useCallback(
    async (amount: string): Promise<DepositResult> => {
      if (!wallet) {
        throw new Error('No active wallet');
      }

      const amountNum = parseFloat(amount);

      // Track deposit initiated
      telemetryService.trackEvent('deposit_initiated', {
        amount: amountNum,
      });

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

        // Track deposit completed
        telemetryService.trackEvent('deposit_completed', {
          amount: amountNum,
          txHash: result.txHash,
        });

        // UI Layer: Refresh balances after successful deposit
        await refreshBalances();

        return result;
      } catch (error) {
        // Track deposit failed
        telemetryService.trackEvent('deposit_failed', {
          amount: amountNum,
          reason: error instanceof Error ? error.message : String(error),
        });

        console.error('[useBridge] Deposit failed:', error);
        throw error;
      } finally {
        setIsDepositing(false);
      }
    },
    [depositUsdcUseCase, wallet, refreshBalances, telemetryService],
  );

  /**
   * Withdraw USDC from Hyperliquid to Arbitrum
   */
  const withdraw = useCallback(
    async (destinationAddress: string, amount: string): Promise<WithdrawalResult> => {
      if (!wallet) {
        throw new Error('No active wallet');
      }

      const amountNum = parseFloat(amount);

      // Track withdraw initiated
      telemetryService.trackEvent('withdraw_initiated', {
        amount: amountNum,
        destinationAddress,
      });

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

        // Track withdraw completed
        telemetryService.trackEvent('withdraw_completed', {
          amount: amountNum,
        });

        // UI Layer: Refresh balances after successful withdrawal
        await refreshBalances();

        return result;
      } catch (error) {
        // Track withdraw failed
        telemetryService.trackEvent('withdraw_failed', {
          amount: amountNum,
          reason: error instanceof Error ? error.message : String(error),
        });

        console.error('[useBridge] Withdrawal failed:', error);
        throw error;
      } finally {
        setIsWithdrawing(false);
      }
    },
    [withdrawUsdcUseCase, wallet, getSigner, refreshBalances, telemetryService],
  );

  return {
    arbitrumBalance,
    arbitrumEthBalance,
    withdrawableBalance,
    isLoadingBalances,
    error,
    isDepositing,
    isWithdrawing,
    refreshBalances,
    deposit,
    withdraw,
  };
}
