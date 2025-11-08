import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner-native';
import { useActiveAssetData } from './useActiveAssetData';
import { useHyperliquidClient } from '../client/useHyperliquidClient';

interface UseMarginLeverageParams {
  coin: string;
}

export interface MarginLeverage {
  /** Leverage value (e.g., 5, 10, 20) */
  leverage: number;
  /** Margin mode */
  marginMode: 'isolated' | 'cross';
}

interface UseMarginLeverageResult {
  /** Current margin and leverage data from real-time WebSocket feed */
  marginLeverage: MarginLeverage;
  /** Whether margin leverage data is still loading */
  isLoading: boolean;
  /** Whether a margin/leverage update is in progress */
  isUpdating: boolean;
  /** Update margin mode and leverage for the current coin */
  setMarginLeverage: (params: SetMarginLeverageParams) => Promise<void>;
}

export interface SetMarginLeverageParams {
  /** New leverage value */
  leverage: number;
  /** Margin mode */
  marginMode: 'isolated' | 'cross';
}

/**
 * Hook to get and update real-time margin mode and leverage for a specific coin
 *
 * Provides current margin and leverage data from WebSocket feed and a method to
 * update them via the Hyperliquid Exchange API.
 *
 * @param coin - Asset symbol (e.g., 'BTC', 'ETH', 'SOL')
 * @returns Object containing margin/leverage data, loading states, and setMarginLeverage function
 *
 * @example
 * ```typescript
 * const { marginLeverage, setMarginLeverage, isUpdating } = useMarginLeverage({ coin: 'BTC' });
 *
 * // Access margin and leverage data
 * console.log(marginLeverage.leverage);    // 5
 * console.log(marginLeverage.marginMode);  // "isolated" or "cross"
 *
 * // Format for display
 * const displayMode = marginLeverage.marginMode === 'cross' ? 'Cross' : 'Isolated';
 * console.log(`${marginLeverage.leverage}x ${displayMode}`); // "5x Isolated"
 *
 * // Update margin mode and leverage
 * await setMarginLeverage({ leverage: 10, marginMode: 'isolated' });
 * ```
 */
export function useMarginLeverage({ coin }: UseMarginLeverageParams): UseMarginLeverageResult {
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();
  const { data: activeAssetData, isLoading } = useActiveAssetData({ coin });

  const [isUpdating, setIsUpdating] = useState(false);

  // Extract and memoize margin and leverage data
  const marginLeverage = useMemo<MarginLeverage>(
    () => ({
      leverage: activeAssetData?.leverage?.value ?? 5,
      marginMode: activeAssetData?.leverage?.type ?? 'isolated',
    }),
    [activeAssetData],
  );

  // Update margin mode and leverage via Hyperliquid API
  const setMarginLeverage = useCallback(
    async ({ leverage: newLeverage, marginMode }: SetMarginLeverageParams) => {
      if (isUpdating) {
        return;
      }

      setIsUpdating(true);

      try {
        // Get exchange client (may trigger wallet approval)
        const exchangeClient = await getAgentExchangeClient();
        if (!exchangeClient) {
          // User cancelled or approval failed
          setIsUpdating(false);
          return;
        }

        // Get asset ID from symbol converter
        const converter = await getSymbolConverter();
        const assetId = converter.getAssetId(coin);

        if (assetId === undefined) {
          toast.error('Invalid Asset', {
            description: `Unable to find asset ID for ${coin}`,
          });
          setIsUpdating(false);
          return;
        }

        // Convert marginMode to isCross for API
        const isCross = marginMode === 'cross';

        // Call Hyperliquid API to update leverage
        await exchangeClient.updateLeverage({
          asset: assetId,
          isCross,
          leverage: newLeverage,
        });

        // WebSocket will automatically update activeAssetData with new values
        const displayMode = marginMode === 'cross' ? 'Cross' : 'Isolated';
        toast.success('Margin and Leverage Updated', {
          description: `Successfully set to ${newLeverage}x ${displayMode} for ${coin}`,
        });
      } catch (error) {
        console.error('[useMarginLeverage] Failed to update margin/leverage:', error);
        toast.error('Failed to Update Margin/Leverage', {
          description: error instanceof Error ? error.message : 'An error occurred',
        });
      } finally {
        setIsUpdating(false);
      }
    },
    [coin, getAgentExchangeClient, getSymbolConverter, isUpdating],
  );

  return {
    marginLeverage,
    isLoading,
    isUpdating,
    setMarginLeverage,
  };
}
