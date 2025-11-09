import { useCallback, useMemo, useState } from 'react';
import { toast } from 'sonner-native';
import { useHyperliquidClient } from '@/lib/hyperliquid/client/useHyperliquidClient';
import { useMarketsStore } from '@/lib/riverrun/market';
import { useActiveAssetData } from '@/lib/hyperliquid/hooks/useActiveAssetData';

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
  /** Current margin and leverage data (undefined while loading) */
  marginLeverage: MarginLeverage | undefined;
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
 * Hybrid Strategy:
 * 1. Fast HTTP API fetch for initial data (100-300ms)
 * 2. WebSocket subscription for real-time updates
 *
 * Uses the selected market from `useMarketsStore` as the single source of truth.
 *
 * @returns Object containing margin/leverage data, loading states, and setMarginLeverage function
 *
 * @example
 * ```typescript
 * const { marginLeverage, isLoading, setMarginLeverage } = useMarginLeverage();
 *
 * // Handle loading state
 * if (isLoading || !marginLeverage) {
 *   return <Loading />;
 * }
 *
 * // Access margin and leverage data
 * console.log(marginLeverage.leverage);
 * console.log(marginLeverage.marginMode);
 *
 * // Update margin mode and leverage
 * await setMarginLeverage({ leverage: 10, marginMode: 'isolated' });
 * ```
 */
export function useMarginLeverage(): UseMarginLeverageResult {
  const { getAgentExchangeClient } = useHyperliquidClient();
  const { selectedMarket, markets } = useMarketsStore();

  // Fail fast if no market is selected
  if (!selectedMarket) {
    throw new Error('[useMarginLeverage] No market selected in store');
  }

  const coin = selectedMarket.coin;
  const { data: activeAssetData, isLoading: isLoadingActiveAsset } = useActiveAssetData({ coin });

  const [isUpdating, setIsUpdating] = useState(false);

  // Extract and memoize margin and leverage data
  const marginLeverage = useMemo<MarginLeverage | undefined>(() => {
    // Get base max leverage for this market from meta API
    const market = markets.find(m => m.coin === coin);
    if (!market) {
      throw new Error(`[useMarginLeverage] Market not found for ${coin}`);
    }

    const baseMaxLeverage = market.maxLeverage;

    // While loading or no data yet, return undefined to show loading UI
    if (isLoadingActiveAsset || !activeAssetData?.leverage) {
      return undefined;
    }

    // Once data is loaded, show real leverage data
    const leverage = activeAssetData.leverage.value;
    const marginMode = activeAssetData.leverage.type;

    return {
      leverage,
      marginMode,
      minLeverage: 1,
      maxLeverage: baseMaxLeverage,
    };
  }, [activeAssetData, coin, markets, isLoadingActiveAsset]);

  // Update margin mode and leverage via Hyperliquid API
  const setMarginLeverage = useCallback(
    async ({ leverage: newLeverage, marginMode }: SetMarginLeverageParams) => {
      if (isUpdating) {
        return;
      }

      // Validate leverage range
      if (!marginLeverage) {
        toast.error('Data Not Ready', {
          description: 'Leverage data is still loading',
        });
        return;
      }

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

        // Get asset ID from markets store (from metaAndAssetCtxs subscription)
        const market = markets.find(m => m.coin === coin);
        if (!market) {
          toast.error('Invalid Asset', {
            description: `Unable to find market data for ${coin}`,
          });
          setIsUpdating(false);
          return;
        }

        const assetId = market.assetId;

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
    [coin, getAgentExchangeClient, markets, isUpdating, marginLeverage],
  );

  return {
    marginLeverage,
    isLoading: isLoadingActiveAsset,
    isUpdating,
    setMarginLeverage,
  };
}
