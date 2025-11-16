/**
 * useMargin - Margin Business Operations Hook
 *
 * Provides business operations for margin/leverage management.
 * For state access, use useMarginStore instead for better performance.
 *
 * Responsibilities:
 * - Validate leverage range (before calling UseCase)
 * - Get agent wallet
 * - Get market data
 * - Call SetMarginLeverageUseCase
 * - Manage UI loading state
 */

import { useCallback, useState } from 'react';
import { useContainer } from '@/app-internal/di';
import { marketStore } from '@/contexts/market/adapters/marketStore';
import { useMarginStore } from './useMarginStore';
import type {
  MarginLeverage,
  SetMarginLeverageParams,
} from '../../../../contexts/margin/ports/types';

export interface UseMarginResult {
  /** UI loading state (for setMarginLeverage operation) */
  isUpdating: boolean;

  /** Business operations */
  setMarginLeverage: (params: SetMarginLeverageParams) => Promise<void>;
  getMarginLeverage: () => MarginLeverage | undefined;
}

/**
 * useMargin - Margin business operations hook
 *
 * For state access, use useMarginStore instead for better performance.
 *
 * @example
 * ```typescript
 * // State access - use useMarginStore
 * const marginLeverage = useMarginStore(state => state.marginLeverage);
 * const isLoading = useMarginStore(state => state.isLoading);
 *
 * // Business operations - use useMargin
 * const { setMarginLeverage, isUpdating } = useMargin();
 *
 * // Usage
 * const handleUpdate = async () => {
 *   try {
 *     await setMarginLeverage({ leverage: 10, marginMode: 'isolated' });
 *   } catch (error) {
 *     console.error('Failed to update leverage:', error);
 *   }
 * };
 * ```
 */
export function useMargin(): UseMarginResult {
  const setMarginLeverageUseCase = useContainer(c => c.setMarginLeverageUseCase);
  const tryGetAgentWallet = useContainer(c => c.tryGetAgentWalletUseCase);

  // UI state only (for setMarginLeverage operation)
  const [isUpdating, setIsUpdating] = useState(false);

  // Business operation: Update margin/leverage
  const setMarginLeverage = useCallback(
    async (params: SetMarginLeverageParams) => {
      const { leverage: newLeverage, marginMode } = params;

      // Validation: Check leverage range
      const currentMarginLeverage = useMarginStore.getState().marginLeverage;
      if (!currentMarginLeverage) {
        throw new Error('Margin leverage data is not loaded');
      }

      const { minLeverage, maxLeverage } = currentMarginLeverage;
      if (newLeverage < minLeverage || newLeverage > maxLeverage) {
        throw new Error(`Leverage must be between ${minLeverage} and ${maxLeverage}`);
      }

      // Get selected market
      const selectedMarket = marketStore.getState().selectedMarket;
      if (!selectedMarket) {
        throw new Error('No market selected');
      }

      // Get market data for assetId
      const markets = marketStore.getState().markets;
      const market = markets.find(m => m.coin === selectedMarket.coin);
      if (!market) {
        throw new Error(`Market not found for ${selectedMarket.coin}`);
      }

      // Get agent wallet
      const { agentWallet } = await tryGetAgentWallet.execute();
      if (!agentWallet) {
        throw new Error('Agent wallet not available');
      }

      // Execute UseCase
      setIsUpdating(true);
      try {
        await setMarginLeverageUseCase.execute({
          agentWallet: {
            address: agentWallet.address,
            signer: agentWallet.signer,
          },
          coin: selectedMarket.coin,
          assetId: market.assetId,
          leverage: newLeverage,
          marginMode,
        });

        // WebSocket will automatically update marginStore with new values
        // No need to manually update the store
      } finally {
        setIsUpdating(false);
      }
    },
    [setMarginLeverageUseCase, tryGetAgentWallet],
  );

  // Query operation: Get margin/leverage (read from store)
  const getMarginLeverage = useCallback(() => {
    return useMarginStore.getState().marginLeverage;
  }, []);

  return {
    isUpdating,
    setMarginLeverage,
    getMarginLeverage,
  };
}
