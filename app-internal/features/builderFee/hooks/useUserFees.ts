import { useCallback, useState } from 'react';

import { useContainer } from '@/app-internal/di';
import { useWallet } from '@/app-internal/features/wallet/hooks/useWallet';
import type { UserFeeRates } from '@/contexts/builderFee/ports/types';

/**
 * Result returned by useUserFees hook
 */
export interface UseUserFeesResult {
  /**
   * User's fee rates (undefined if not loaded)
   * Includes effective rates with all discounts and builder fee applied
   */
  feeRates: UserFeeRates | undefined;

  /**
   * Loading state for fee rate operations
   */
  isLoading: boolean;

  /**
   * Error message if loading failed
   */
  error: string | undefined;

  /**
   * Load user fee rates from Hyperliquid API
   *
   * This method must be called manually to initialize fee rate data.
   * It fetches the user's fee rates including any referral/staking discounts
   * and calculates the final rates including builder fee.
   *
   * @returns Promise resolving to user fee rates, or undefined if failed
   *
   * @example
   * ```tsx
   * useEffect(() => {
   *   loadUserFees();
   * }, [loadUserFees]);
   * ```
   */
  loadUserFees: () => Promise<UserFeeRates | undefined>;
}

/**
 * useUserFees - User fee rates hook
 *
 * This hook provides access to the user's trading fee rates from Hyperliquid.
 * The rates include all discounts (referral, staking) and the builder fee.
 *
 * IMPORTANT: This hook does NOT auto-load data. Call loadUserFees() to initialize.
 *
 * Fee calculation:
 * - Base rates come from Hyperliquid userFees API
 * - Referral and staking discounts are applied multiplicatively
 * - Builder fee (0.025%) is added on top
 *
 * @example
 * ```tsx
 * import { useUserFees } from '@/app-internal';
 *
 * const { feeRates, isLoading, loadUserFees } = useUserFees();
 *
 * // Load data on mount
 * useEffect(() => {
 *   loadUserFees();
 * }, [loadUserFees]);
 *
 * // Display fee rates
 * {feeRates && (
 *   <Text>
 *     Fees: {feeRates.takerFeePercent.toFixed(4)}% / {feeRates.makerFeePercent.toFixed(4)}%
 *   </Text>
 * )}
 * ```
 */
export function useUserFees(): UseUserFeesResult {
  const getUserFeesUseCase = useContainer(c => c.getUserFeesUseCase);
  const { wallet } = useWallet();

  // State management
  const [feeRates, setFeeRates] = useState<UserFeeRates | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  /**
   * Load user fee rates from API
   * Updates hook's state after fetching
   */
  const loadUserFees = useCallback(async (): Promise<UserFeeRates | undefined> => {
    if (!wallet) {
      setFeeRates(undefined);
      return undefined;
    }

    setIsLoading(true);
    setError(undefined);

    try {
      const rates = await getUserFeesUseCase.execute({ walletAddress: wallet.address });
      setFeeRates(rates);
      return rates;
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to load fee rates';
      setError(message);
      console.error('Failed to load user fee rates:', e);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  }, [getUserFeesUseCase, wallet]);

  return {
    feeRates,
    isLoading,
    error,
    loadUserFees,
  };
}
