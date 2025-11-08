import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner-native';
import { useHyperliquidClient } from '../client/useHyperliquidClient';
import { useMarketsStore } from '../market';
import { useActiveAssetData } from './useActiveAssetData';
import { useWebData2 } from './useWebData2';

export interface MarginLeverage {
  /** Leverage value (e.g., 5, 10, 20) */
  leverage: number;
  /** Margin mode */
  marginMode: 'isolated' | 'cross';
  /** Minimum leverage allowed (always 1) */
  minLeverage: number;
  /** Maximum leverage allowed based on current position size and margin tiers */
  maxLeverage: number;
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
 * Hook to get and update real-time margin mode and leverage for the currently selected market
 *
 * Provides current margin and leverage data from WebSocket feed and a method to
 * update them via the Hyperliquid Exchange API.
 *
 * Uses the selected market from `useMarketsStore` as the single source of truth.
 *
 * @returns Object containing margin/leverage data, loading states, and setMarginLeverage function
 *
 * @example
 * ```typescript
 * const { marginLeverage, setMarginLeverage, isUpdating } = useMarginLeverage();
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
export function useMarginLeverage(): UseMarginLeverageResult {
  const { getAgentExchangeClient, getSymbolConverter } = useHyperliquidClient();
  const { selectedMarket, markets } = useMarketsStore();
  const coin = selectedMarket?.coin || 'BTC'; // Fallback to BTC if no market selected
  const { data: activeAssetData, isLoading } = useActiveAssetData({ coin });
  const { data: webData } = useWebData2();

  const [isUpdating, setIsUpdating] = useState(false);

  // Extract and memoize margin and leverage data
  const marginLeverage = useMemo<MarginLeverage>(() => {
    const leverage = activeAssetData?.leverage?.value ?? 5;
    const marginMode = activeAssetData?.leverage?.type ?? 'isolated';

    // Get base max leverage for this market from meta API
    const market = markets.find(m => m.coin === coin);
    const baseMaxLeverage = market?.maxLeverage ?? 20;

    // If user has a position, use the calculated maxLeverage from clearinghouseState
    // This considers the current notional position value and margin tiers
    let maxLeverage = baseMaxLeverage;

    if (webData?.clearinghouseState?.assetPositions) {
      const position = webData.clearinghouseState.assetPositions.find(
        asset => asset.position.coin === coin,
      );

      if (position) {
        // Use the maxLeverage from the position data (calculated by API based on margin tiers)
        // This is more restrictive than baseMaxLeverage when position size is large
        maxLeverage = position.position.maxLeverage;
      }
    }

    return {
      leverage,
      marginMode,
      minLeverage: 1,
      maxLeverage,
    };
  }, [activeAssetData, webData, coin, markets]);

  // Update margin mode and leverage via Hyperliquid API
  const setMarginLeverage = useCallback(
    async ({ leverage: newLeverage, marginMode }: SetMarginLeverageParams) => {
      if (isUpdating) {
        return;
      }

      // Validate leverage range
      const currentMaxLeverage = marginLeverage.maxLeverage;
      if (newLeverage < 1 || newLeverage > currentMaxLeverage) {
        toast.error('Invalid Leverage', {
          description: `Leverage must be between 1 and ${currentMaxLeverage}`,
        });
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
        toast.success('Margin and Leverage Updated', {
          description: `Successfully set to ${newLeverage}x ${marginMode} for ${coin}`,
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
    [coin, getAgentExchangeClient, getSymbolConverter, isUpdating, marginLeverage.maxLeverage],
  );

  return {
    marginLeverage,
    isLoading,
    isUpdating,
    setMarginLeverage,
  };
}
